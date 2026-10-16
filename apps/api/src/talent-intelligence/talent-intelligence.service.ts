import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { ContributionValidationStatus, SkillLevel } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { calculateMatch, DEFAULT_MATCHING_WEIGHTS } from '../matching/matching.engine';
import { PrismaService } from '../prisma/prisma.service';
import { activeCertificateWhere } from '../experiences/certificate-evidence';
import type { ContributionRequestDto } from './dto/talent-intelligence.dto';

@Injectable()
export class TalentIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async evidence(userId: string) {
    const candidate = await this.candidate(userId);
    return this.recalculateEvidence(candidate.id);
  }

  async recalculateEvidence(candidateId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        skills: { include: { skill: true } },
        projects: {
          include: { contributions: { where: { status: ContributionValidationStatus.VERIFIED } } },
        },
        verifiedExperiences: {
          where: activeCertificateWhere,
          include: { skills: true, application: { include: { evaluation: true } } },
        },
      },
    });
    if (!candidate) throw new NotFoundException('Perfil de candidato no encontrado');
    const allSkills = await this.prisma.skill.findMany({ where: { active: true } });
    const declared = new Map(candidate.skills.map((item) => [item.skillId, item.level]));
    const results = allSkills.flatMap((skill) => {
      const projectCount = candidate.projects.filter((project) => {
        const technologyEvidence = project.technologies.some(
          (technology) =>
            this.related(technology, skill.name) || this.related(technology, skill.slug),
        );
        const peerEvidence = project.contributions.some((contribution) =>
          contribution.skillIds.includes(skill.id),
        );
        return technologyEvidence || peerEvidence;
      }).length;
      const verified = candidate.verifiedExperiences.filter((experience) =>
        experience.skills.some(({ skillId }) => skillId === skill.id),
      );
      const ratings = verified.flatMap((experience) =>
        experience.application.evaluation ? [experience.application.evaluation.finalResult] : [],
      );
      const level = declared.get(skill.id);
      if (!level && !projectCount && !verified.length) return [];
      const declaredScore = level ? Math.round(this.levelRatio(level) * 20) : 0;
      const projectScore = Math.round(Math.min(projectCount / 3, 1) * 25);
      const averageRating = ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null;
      const verifiedScore = verified.length
        ? Math.min(30, verified.length * 15) + Math.round(((averageRating ?? 0) / 5) * 10)
        : 0;
      const sources = Number(!!level) + Number(projectCount > 0) + Number(verified.length > 0);
      const consistencyScore = sources === 3 ? 15 : sources === 2 ? 9 : 4;
      return [
        {
          candidateId,
          skillId: skill.id,
          declaredScore,
          projectScore,
          verifiedScore,
          consistencyScore,
          totalScore: Math.min(
            100,
            declaredScore + projectScore + verifiedScore + consistencyScore,
          ),
          projectCount,
          verifiedCount: verified.length,
          averageRating,
          skill,
        },
      ];
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.skillEvidence.deleteMany({
        where: { candidateId, skillId: { notIn: results.map(({ skillId }) => skillId) } },
      });
      for (const { skill, ...result } of results) {
        void skill;
        await tx.skillEvidence.upsert({
          where: { candidateId_skillId: { candidateId, skillId: result.skillId } },
          create: result,
          update: { ...result, calculatedAt: new Date() },
        });
      }
    });
    return results
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(({ skill, ...result }) => ({
        ...result,
        averageRating: result.averageRating,
        skill,
        explanation: this.evidenceExplanation(result),
      }));
  }

  async improvementRoute(userId: string, vacancyId: string) {
    const candidate = await this.candidate(userId);
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id: vacancyId, status: 'PUBLISHED', adminHidden: false },
      include: {
        company: { select: { id: true, name: true } },
        skills: { include: { skill: true } },
      },
    });
    if (!vacancy) throw new NotFoundException('Vacante no encontrada');
    const profile = await this.prisma.candidateProfile.findUniqueOrThrow({
      where: { id: candidate.id },
      include: { skills: { include: { skill: true } }, educations: true, projects: true },
    });
    const current = calculateMatch(profile, vacancy, DEFAULT_MATCHING_WEIGHTS);
    const candidateIds = new Set(profile.skills.map(({ skillId }) => skillId));
    const missing = vacancy.skills.filter(({ skillId }) => !candidateIds.has(skillId));
    const experiences = await this.prisma.experienceOpportunity.findMany({
      where: {
        status: 'PUBLISHED',
        skills: { some: { skillId: { in: missing.map(({ skillId }) => skillId) } } },
      },
      include: { company: { select: { name: true } }, skills: { include: { skill: true } } },
    });
    let projectedScore = current.score;
    const steps = missing.map((item, index) => {
      const practical = experiences.find((experience) =>
        experience.skills.some(({ skillId }) => skillId === item.skillId),
      );
      const skillImpact = Math.max(
        1,
        Math.round(
          (50 * (item.weight * (item.priority === 'REQUIRED' ? 2 : 1))) /
            Math.max(
              1,
              vacancy.skills.reduce(
                (sum, skill) => sum + skill.weight * (skill.priority === 'REQUIRED' ? 2 : 1),
                0,
              ),
            ),
        ),
      );
      projectedScore = Math.min(100, projectedScore + skillImpact);
      return {
        order: index + 1,
        skill: item.skill,
        priority: item.priority,
        action: practical ? 'COMPLETE_EXPERIENCE' : 'BUILD_PROJECT',
        experience: practical
          ? { id: practical.id, title: practical.title, company: practical.company.name }
          : null,
        guidance: practical
          ? `Completa ${practical.title} para obtener evidencia empresarial de ${item.skill.name}.`
          : `Construye y documenta un proyecto real que utilice ${item.skill.name}.`,
        potentialGain: skillImpact,
        projectedScore,
      };
    });
    return {
      vacancy: { id: vacancy.id, title: vacancy.title, company: vacancy.company },
      current,
      targetScore: projectedScore,
      steps,
      disclaimer:
        'La mejora es una proyección determinística; el resultado real depende de la evidencia registrada y de que la vacante no cambie.',
    };
  }

  async companyIndexForOwner(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) throw new NotFoundException('Perfil de empresa no encontrado');
    return this.companyIndex(company.id);
  }
  async companyIndex(companyId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        vacancies: {
          select: {
            experienceRequired: true,
            maxExperienceMonths: true,
            status: true,
            applications: { select: { status: true, statusHistory: { select: { id: true } } } },
          },
        },
        experienceOpportunities: {
          select: {
            applications: { select: { status: true, evaluation: { select: { id: true } } } },
          },
        },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const applications = company.vacancies.flatMap((vacancy) => vacancy.applications);
    const experienceApplications = company.experienceOpportunities.flatMap(
      (experience) => experience.applications,
    );
    const responded = applications.filter(({ status }) => status !== 'APPLIED').length;
    const finalProcesses = applications.filter(({ status }) =>
      ['SELECTED', 'REJECTED', 'WITHDRAWN'].includes(status),
    ).length;
    const feedback =
      applications.filter(({ statusHistory }) => statusHistory.length > 1).length +
      experienceApplications.filter(({ evaluation }) => evaluation).length;
    const juniorFriendly = company.vacancies.filter(
      (vacancy) => !vacancy.experienceRequired && vacancy.maxExperienceMonths <= 12,
    ).length;
    const selected = applications.filter(({ status }) => status === 'SELECTED').length;
    const responseRate = this.rate(responded, applications.length);
    const processCompletionRate = this.rate(finalProcesses, applications.length);
    const feedbackRate = this.rate(feedback, applications.length + experienceApplications.length);
    const juniorFriendlyRate = this.rate(juniorFriendly, company.vacancies.length);
    const selectionRate = this.rate(selected, applications.length);
    const sampleSize = applications.length + experienceApplications.length;
    const score = sampleSize
      ? Math.round(
          responseRate * 0.25 +
            processCompletionRate * 0.25 +
            feedbackRate * 0.15 +
            juniorFriendlyRate * 0.25 +
            selectionRate * 0.1,
        )
      : 50;
    const result = await this.prisma.companyOpportunityIndex.upsert({
      where: { companyId },
      create: {
        companyId,
        score,
        responseRate,
        processCompletionRate,
        feedbackRate,
        juniorFriendlyRate,
        selectionRate,
        sampleSize,
      },
      update: {
        score,
        responseRate,
        processCompletionRate,
        feedbackRate,
        juniorFriendlyRate,
        selectionRate,
        sampleSize,
        calculatedAt: new Date(),
      },
    });
    return {
      ...result,
      company: {
        id: company.id,
        name: company.name,
        verificationStatus: company.verificationStatus,
      },
      confidence: sampleSize >= 10 ? 'HIGH' : sampleSize >= 3 ? 'MEDIUM' : 'LOW',
      explanation: sampleSize
        ? 'Calculado con respuestas, cierre de procesos, retroalimentación, requisitos junior y selecciones reales.'
        : 'Puntuación neutral provisional: todavía no existen procesos suficientes.',
    };
  }

  async requestContribution(userId: string, dto: ContributionRequestDto) {
    const candidate = await this.candidate(userId);
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, candidateId: candidate.id },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (owner?.email.toLowerCase() === dto.validatorEmail.toLowerCase())
      throw new BadRequestException('No puedes validar tu propia contribución');
    const pending = await this.prisma.projectContribution.findFirst({
      where: {
        projectId: dto.projectId,
        validatorEmail: dto.validatorEmail.toLowerCase(),
        status: ContributionValidationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending)
      throw new ConflictException('Ya existe una solicitud pendiente para este validador');
    const validSkills = await this.prisma.skill.count({
      where: { id: { in: dto.skillIds }, active: true },
    });
    if (validSkills !== dto.skillIds.length)
      throw new BadRequestException('Una o más habilidades no son válidas');
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hash(rawToken);
    const contribution = await this.prisma.projectContribution.create({
      data: {
        ...dto,
        validatorEmail: dto.validatorEmail.toLowerCase(),
        candidateId: candidate.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
      select: { id: true, status: true, expiresAt: true },
    });
    const webUrl = this.config.get<string>('CORS_ORIGIN')?.split(',')[0] ?? 'http://localhost:5174';
    if (this.mail.enabled)
      await this.mail
        .send(
          dto.validatorEmail,
          `Valida una contribución en ConekTa: ${project.title}`,
          `${candidate.firstName ?? 'Un participante'} te solicita validar su aporte como ${dto.contributionRole}. Revisa y responde aquí: ${webUrl}/validate-contribution/${rawToken}`,
        )
        .catch(() => undefined);
    return {
      ...contribution,
      message: 'Solicitud enviada. El token nunca se almacena en texto plano.',
    };
  }

  async contributions(userId: string) {
    const candidate = await this.candidate(userId);
    return this.prisma.projectContribution.findMany({
      where: { candidateId: candidate.id },
      include: { project: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async contributionPreview(token: string) {
    const item = await this.contributionByToken(token);
    return {
      id: item.id,
      project: item.project.title,
      candidate: `${item.candidate.firstName ?? ''} ${item.candidate.lastName ?? ''}`.trim(),
      validatorName: item.validatorName,
      contributionRole: item.contributionRole,
      contributionSummary: item.contributionSummary,
      status: item.status,
      expiresAt: item.expiresAt,
    };
  }
  async validateContribution(token: string, approved: boolean) {
    const item = await this.contributionByToken(token);
    if (item.status !== ContributionValidationStatus.PENDING)
      throw new ConflictException('Esta solicitud ya fue respondida');
    if (item.expiresAt < new Date()) throw new BadRequestException('La solicitud expiró');
    const result = await this.prisma.projectContribution.update({
      where: { id: item.id },
      data: {
        status: approved
          ? ContributionValidationStatus.VERIFIED
          : ContributionValidationStatus.REJECTED,
        respondedAt: new Date(),
        tokenHash: this.hash(randomBytes(32).toString('base64url')),
      },
    });
    await this.recalculateEvidence(item.candidateId);
    return { id: result.id, status: result.status, project: item.project.title };
  }

  async passport(userId: string) {
    const candidate = await this.candidate(userId);
    const passport = await this.ensurePassport(candidate.id);
    return this.passportPayload(passport.publicCode, false, true);
  }
  async passportVisibility(userId: string, active: boolean) {
    const candidate = await this.candidate(userId);
    const passport = await this.ensurePassport(candidate.id);
    return this.prisma.talentPassport.update({ where: { id: passport.id }, data: { active } });
  }
  async publicPassport(code: string) {
    return this.passportPayload(code, true, false);
  }
  async openBadge(code: string) {
    const passport = await this.publicPassport(code);
    const origin =
      this.config.get<string>('PUBLIC_WEB_URL') ??
      this.config.get<string>('WEB_URL') ??
      this.config.get<string>('CORS_ORIGIN')?.split(',')[0] ??
      'http://localhost:5174';
    const api =
      this.config.get<string>('PUBLIC_API_URL') ??
      `http://localhost:${this.config.get<string>('API_PORT') ?? '3000'}`;
    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ],
      id: `${api}/passport/${code}/open-badge`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: { id: origin, type: ['Profile'], name: 'ConekTa' },
      validFrom: passport.passport.issuedAt,
      credentialSubject: {
        id: `urn:conekta:candidate:${code}`,
        type: ['AchievementSubject'],
        achievement: {
          id: `${origin}/passport/${code}`,
          type: ['Achievement'],
          achievementType: 'Portfolio',
          name: 'Pasaporte ConekTa de talento verificable',
          description:
            'Evidencias de habilidades, proyectos y experiencia práctica verificadas en ConekTa.',
          criteria: {
            narrative:
              'El titular registra proyectos y obtiene validaciones empresariales o de colaboradores sobre competencias demostradas.',
          },
          alignment: passport.skillEvidence.map((evidence) => ({
            type: ['Alignment'],
            targetName: evidence.skill.name,
            targetCode: evidence.skill.slug,
            targetDescription: `Puntuación de evidencia ${evidence.totalScore}/100`,
          })),
        },
      },
      credentialStatus: { id: `${api}/passport/${code}`, type: 'ConekTaPassportStatus' },
      evidence: passport.verifiedExperiences.map((experience) => ({
        id: `${origin}/verify/${experience.certificate?.code ?? ''}`,
        type: ['Evidence'],
        name: experience.title,
      })),
    };
  }

  private async passportPayload(code: string, requireActive: boolean, refreshEvidence: boolean) {
    if (!/^CNK-PASS-[A-F0-9]{16}$/.test(code))
      throw new NotFoundException('Pasaporte no encontrado');
    const passport = await this.prisma.talentPassport.findFirst({
      where: { publicCode: code, ...(requireActive ? { active: true } : {}) },
      include: {
        candidate: {
          include: {
            projects: {
              include: {
                contributions: {
                  where: { status: ContributionValidationStatus.VERIFIED },
                  select: {
                    id: true,
                    validatorName: true,
                    contributionRole: true,
                    contributionSummary: true,
                    respondedAt: true,
                  },
                },
              },
            },
            skillEvidence: { include: { skill: true }, orderBy: { totalScore: 'desc' } },
            verifiedExperiences: {
              where: { public: true, ...activeCertificateWhere },
              include: { skills: { include: { skill: true } }, certificate: true },
            },
          },
        },
      },
    });
    if (!passport) throw new NotFoundException('Pasaporte no encontrado');
    const skillEvidence = refreshEvidence
      ? await this.recalculateEvidence(passport.candidateId)
      : passport.candidate.skillEvidence.map((evidence) => ({
          ...evidence,
          averageRating: evidence.averageRating ? Number(evidence.averageRating) : null,
          explanation: this.evidenceExplanation(evidence),
        }));
    return {
      passport: {
        publicCode: passport.publicCode,
        active: passport.active,
        issuedAt: passport.issuedAt,
        updatedAt: passport.updatedAt,
      },
      candidate: {
        name: `${passport.candidate.firstName ?? ''} ${passport.candidate.lastName ?? ''}`.trim(),
        headline: passport.candidate.headline,
        city: passport.candidate.city,
        country: passport.candidate.country,
        portfolioUrl: passport.candidate.portfolioUrl,
      },
      skillEvidence,
      projects: passport.candidate.projects.map((project) => ({
        id: project.id,
        title: project.title,
        role: project.role,
        description: project.description,
        technologies: project.technologies,
        universityProject: project.universityProject,
        url: project.url,
        githubUrl: project.githubUrl,
        verifiedContributions: project.contributions,
      })),
      verifiedExperiences: passport.candidate.verifiedExperiences,
    };
  }
  private async ensurePassport(candidateId: string) {
    return this.prisma.talentPassport.upsert({
      where: { candidateId },
      create: {
        candidateId,
        publicCode: `CNK-PASS-${randomBytes(8).toString('hex').toUpperCase()}`,
      },
      update: {},
    });
  }
  private async contributionByToken(token: string) {
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token))
      throw new NotFoundException('Solicitud no encontrada');
    const item = await this.prisma.projectContribution.findUnique({
      where: { tokenHash: this.hash(token) },
      include: {
        project: { select: { title: true } },
        candidate: { select: { firstName: true, lastName: true } },
      },
    });
    if (!item) throw new NotFoundException('Solicitud no encontrada');
    return item;
  }
  private async candidate(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException('Perfil de candidato no encontrado');
    return candidate;
  }
  private evidenceExplanation(result: {
    declaredScore: number;
    projectScore: number;
    verifiedScore: number;
    consistencyScore: number;
  }) {
    return {
      declared: `${result.declaredScore}/20 por nivel declarado`,
      projects: `${result.projectScore}/25 por uso en proyectos o contribuciones confirmadas`,
      verified: `${result.verifiedScore}/40 por experiencias y evaluación empresarial`,
      consistency: `${result.consistencyScore}/15 por coincidencia entre fuentes`,
    };
  }
  private levelRatio(level: SkillLevel) {
    return level === SkillLevel.ADVANCED ? 1 : level === SkillLevel.INTERMEDIATE ? 0.7 : 0.4;
  }
  private rate(value: number, total: number) {
    return total ? Math.round((value / total) * 100) : 0;
  }
  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
  private related(left: string, right: string) {
    const a = this.normalize(left);
    const b = this.normalize(right);
    return a === b || a.includes(b) || b.includes(a);
  }
  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
