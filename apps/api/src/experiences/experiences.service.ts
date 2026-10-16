import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ExperienceApplicationStatus, ExperienceOpportunityStatus, Prisma } from '@prisma/client';
import { calculateMatch, DEFAULT_MATCHING_WEIGHTS } from '../matching/matching.engine';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ExperienceApplyDto,
  ExperienceEvaluationDto,
  ExperienceOpportunityDto,
  ExperienceQueryDto,
  ExperienceSubmissionDto,
} from './dto/experiences.dto';

@Injectable()
export class ExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  async companyList(userId: string) {
    const company = await this.company(userId);
    return this.prisma.experienceOpportunity.findMany({
      where: { companyId: company.id },
      include: this.companyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async companyDashboard(userId: string) {
    const company = await this.company(userId);
    const [published, active, participants, pendingSubmissions, completed] = await Promise.all([
      this.prisma.experienceOpportunity.count({
        where: { companyId: company.id, status: ExperienceOpportunityStatus.PUBLISHED },
      }),
      this.prisma.experienceOpportunity.count({
        where: { companyId: company.id, status: ExperienceOpportunityStatus.IN_PROGRESS },
      }),
      this.prisma.experienceApplication.count({
        where: {
          experience: { companyId: company.id },
          status: {
            in: [
              ExperienceApplicationStatus.ACCEPTED,
              ExperienceApplicationStatus.IN_PROGRESS,
              ExperienceApplicationStatus.SUBMITTED,
              ExperienceApplicationStatus.COMPLETED,
            ],
          },
        },
      }),
      this.prisma.experienceApplication.count({
        where: {
          experience: { companyId: company.id },
          status: ExperienceApplicationStatus.SUBMITTED,
        },
      }),
      this.prisma.experienceApplication.count({
        where: {
          experience: { companyId: company.id },
          status: ExperienceApplicationStatus.COMPLETED,
        },
      }),
    ]);
    return { published, active, participants, pendingSubmissions, completed };
  }

  async companyDetail(userId: string, id: string) {
    const company = await this.company(userId);
    const result = await this.prisma.experienceOpportunity.findFirst({
      where: { id, companyId: company.id },
      include: this.companyInclude,
    });
    if (!result) throw new NotFoundException('Experiencia no encontrada');
    return result;
  }

  async create(userId: string, dto: ExperienceOpportunityDto) {
    const company = await this.company(userId);
    this.validateDates(dto);
    const { skills, startsAt, deadline, ...data } = dto;
    return this.prisma.experienceOpportunity.create({
      data: {
        ...data,
        startsAt: startsAt ? new Date(startsAt) : null,
        deadline: deadline ? new Date(deadline) : null,
        companyId: company.id,
        skills: { create: skills },
      },
      include: this.companyInclude,
    });
  }

  async update(userId: string, id: string, dto: ExperienceOpportunityDto) {
    const current = await this.companyDetail(userId, id);
    if (
      current.status !== ExperienceOpportunityStatus.DRAFT &&
      current.status !== ExperienceOpportunityStatus.PUBLISHED
    )
      throw new BadRequestException('No se puede editar una experiencia iniciada o finalizada');
    this.validateDates(dto);
    const { skills, startsAt, deadline, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      await tx.experienceSkill.deleteMany({ where: { experienceId: id } });
      return tx.experienceOpportunity.update({
        where: { id },
        data: {
          ...data,
          startsAt: startsAt ? new Date(startsAt) : null,
          deadline: deadline ? new Date(deadline) : null,
          skills: { create: skills },
        },
        include: this.companyInclude,
      });
    });
  }

  async publish(userId: string, id: string) {
    const item = await this.companyDetail(userId, id);
    if (!item.skills.length || !item.expectedDeliverables.length)
      throw new BadRequestException('Define habilidades y entregables antes de publicar');
    return this.prisma.experienceOpportunity.update({
      where: { id },
      data: { status: ExperienceOpportunityStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    const item = await this.companyDetail(userId, id);
    if (item.status !== ExperienceOpportunityStatus.DRAFT || item.applications.length)
      throw new BadRequestException('Solo se pueden eliminar borradores sin postulaciones');
    await this.prisma.experienceOpportunity.delete({ where: { id } });
  }

  publicList(query: ExperienceQueryDto) {
    return this.prisma.experienceOpportunity.findMany({
      where: this.publicWhere(query),
      include: this.publicInclude,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publicDetail(id: string) {
    const item = await this.prisma.experienceOpportunity.findFirst({
      where: { id, status: ExperienceOpportunityStatus.PUBLISHED },
      include: this.publicInclude,
    });
    if (!item) throw new NotFoundException('Experiencia no encontrada');
    return item;
  }

  async candidateList(userId: string, query: ExperienceQueryDto) {
    const candidate = await this.candidate(userId);
    const [opportunities, vacancies] = await Promise.all([
      this.prisma.experienceOpportunity.findMany({
        where: this.publicWhere(query),
        include: this.publicInclude,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.vacancy.findMany({
        where: { status: 'PUBLISHED', adminHidden: false },
        select: { skills: { where: { priority: 'REQUIRED' }, select: { skillId: true } } },
      }),
    ]);
    const candidateSkillIds = new Set(candidate.skills.map(({ skillId }) => skillId));
    const missingDemand = new Map<string, number>();
    for (const vacancy of vacancies)
      for (const { skillId } of vacancy.skills)
        if (!candidateSkillIds.has(skillId))
          missingDemand.set(skillId, (missingDemand.get(skillId) ?? 0) + 1);
    return opportunities
      .map((experience) => {
        const compatibility = this.match(candidate, experience);
        const developmentSkills = experience.skills
          .filter(({ skillId }) => missingDemand.has(skillId))
          .map(({ skill, skillId }) => ({
            name: skill.name,
            vacancyDemand: missingDemand.get(skillId)!,
          }))
          .sort((a, b) => b.vacancyDemand - a.vacancyDemand);
        const demandBonus = Math.min(
          10,
          developmentSkills.reduce((sum, skill) => sum + skill.vacancyDemand, 0) * 2,
        );
        const interestBonus = candidate.professionalInterests.some((interest) =>
          experience.professionalArea.toLowerCase().includes(interest.toLowerCase()),
        )
          ? 5
          : 0;
        return {
          ...experience,
          compatibility,
          developmentSkills,
          recommendationRank: compatibility.score + demandBonus + interestBonus,
        };
      })
      .sort(
        (a, b) =>
          b.recommendationRank - a.recommendationRank ||
          b.compatibility.score - a.compatibility.score,
      );
  }

  async mine(userId: string) {
    const candidate = await this.candidate(userId);
    const [applications, verifiedExperiences] = await Promise.all([
      this.prisma.experienceApplication.findMany({
        where: { candidateId: candidate.id },
        include: {
          experience: { include: this.publicInclude },
          submission: true,
          evaluation: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.verifiedExperience.findMany({
        where: { candidateId: candidate.id },
        include: { skills: { include: { skill: true } }, certificate: true },
        orderBy: { completedAt: 'desc' },
      }),
    ]);
    const skillIds = new Set(
      verifiedExperiences.flatMap((item) => item.skills.map(({ skillId }) => skillId)),
    );
    return {
      applications,
      verifiedExperiences,
      stats: {
        completed: verifiedExperiences.length,
        verifiedSkills: skillIds.size,
        certificates: verifiedExperiences.filter(({ certificate }) => certificate).length,
        durationWeeks: verifiedExperiences.reduce((sum, item) => sum + item.durationWeeks, 0),
      },
    };
  }

  async apply(userId: string, experienceId: string, dto: ExperienceApplyDto) {
    const [candidate, experience] = await Promise.all([
      this.candidate(userId),
      this.publicDetail(experienceId),
    ]);
    if (experience.deadline && experience.deadline < new Date())
      throw new BadRequestException('La convocatoria ya cerró');
    try {
      return await this.prisma.experienceApplication.create({
        data: {
          experienceId,
          candidateId: candidate.id,
          compatibilityScore: this.match(candidate, experience).score,
          motivation: dto.motivation,
        },
        include: { experience: { include: this.publicInclude } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Ya te postulaste a esta experiencia');
      throw error;
    }
  }

  async applicationStatus(userId: string, id: string, status: ExperienceApplicationStatus) {
    const application = await this.companyApplication(userId, id);
    const allowed: Partial<Record<ExperienceApplicationStatus, ExperienceApplicationStatus[]>> = {
      APPLIED: [ExperienceApplicationStatus.ACCEPTED, ExperienceApplicationStatus.REJECTED],
      ACCEPTED: [ExperienceApplicationStatus.IN_PROGRESS, ExperienceApplicationStatus.CANCELLED],
      IN_PROGRESS: [ExperienceApplicationStatus.CANCELLED],
      SUBMITTED: [ExperienceApplicationStatus.IN_PROGRESS],
    };
    if (!allowed[application.status]?.includes(status))
      throw new BadRequestException('Cambio de estado no permitido');
    if (status === ExperienceApplicationStatus.ACCEPTED) {
      const participating = new Set<ExperienceApplicationStatus>([
        ExperienceApplicationStatus.ACCEPTED,
        ExperienceApplicationStatus.IN_PROGRESS,
        ExperienceApplicationStatus.SUBMITTED,
        ExperienceApplicationStatus.COMPLETED,
      ]);
      const accepted = application.experience.applications.filter((item) =>
        participating.has(item.status),
      ).length;
      if (accepted >= application.experience.participantLimit)
        throw new BadRequestException('Ya se alcanzó el límite de participantes');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.experienceApplication.update({
        where: { id },
        data: {
          status,
          ...(status === ExperienceApplicationStatus.ACCEPTED ? { acceptedAt: new Date() } : {}),
        },
      });
      if (status === ExperienceApplicationStatus.IN_PROGRESS)
        await tx.experienceOpportunity.update({
          where: { id: application.experienceId },
          data: { status: ExperienceOpportunityStatus.IN_PROGRESS },
        });
      await tx.notification.create({
        data: {
          userId: application.candidate.userId,
          type: 'APPLICATION',
          title: 'Actualización de experiencia',
          message: `${application.experience.title}: ${status}`,
          link: '/candidate/experiences',
        },
      });
      return updated;
    });
  }

  async submit(userId: string, id: string, dto: ExperienceSubmissionDto) {
    const candidate = await this.candidate(userId);
    const application = await this.prisma.experienceApplication.findFirst({
      where: { id, candidateId: candidate.id },
      include: { submission: true },
    });
    if (!application) throw new NotFoundException('Postulación no encontrada');
    if (
      application.status !== ExperienceApplicationStatus.ACCEPTED &&
      application.status !== ExperienceApplicationStatus.IN_PROGRESS
    )
      throw new BadRequestException('Esta experiencia no admite una entrega');
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.experienceSubmission.upsert({
        where: { applicationId: id },
        create: { ...dto, applicationId: id },
        update: dto,
      });
      await tx.experienceApplication.update({
        where: { id },
        data: { status: ExperienceApplicationStatus.SUBMITTED },
      });
      return submission;
    });
  }

  async evaluate(userId: string, id: string, dto: ExperienceEvaluationDto) {
    const application = await this.companyApplication(userId, id);
    if (application.status !== ExperienceApplicationStatus.SUBMITTED || !application.submission)
      throw new BadRequestException('Debe existir una entrega pendiente de revisión');
    const allowedIds = new Set(application.experience.skills.map(({ skillId }) => skillId));
    if (dto.verifiedSkillIds.some((skillId) => !allowedIds.has(skillId)))
      throw new ForbiddenException('Solo puedes validar habilidades asociadas a la experiencia');
    return this.prisma.experienceEvaluation.upsert({
      where: { applicationId: id },
      create: { ...dto, applicationId: id },
      update: dto,
    });
  }

  async visibility(userId: string, id: string, isPublic: boolean) {
    const candidate = await this.candidate(userId);
    const result = await this.prisma.verifiedExperience.updateMany({
      where: { id, candidateId: candidate.id },
      data: { public: isPublic },
    });
    if (!result.count) throw new NotFoundException('Experiencia verificada no encontrada');
    return { id, public: isPublic };
  }

  async complete(userId: string, id: string) {
    const application = await this.companyApplication(userId, id);
    if (
      application.status !== ExperienceApplicationStatus.SUBMITTED ||
      !application.submission ||
      !application.evaluation
    )
      throw new BadRequestException(
        'La entrega y la evaluación son obligatorias antes de completar',
      );
    const completedAt = new Date();
    const startsAt =
      application.experience.startsAt ?? application.acceptedAt ?? application.createdAt;
    return this.prisma.$transaction(async (tx) => {
      const verified = await tx.verifiedExperience.create({
        data: {
          applicationId: id,
          candidateId: application.candidateId,
          title: application.experience.title,
          companyName: application.experience.company.name ?? 'Organización ConekTa',
          summary: application.experience.objective,
          startsAt,
          completedAt,
          durationWeeks: application.experience.estimatedDurationWeeks,
          skills: {
            create: application.evaluation!.verifiedSkillIds.map((skillId) => ({ skillId })),
          },
        },
      });
      const certificate = await tx.experienceCertificate.create({
        data: { verifiedExperienceId: verified.id, code: this.certificateCode() },
      });
      await tx.experienceApplication.update({
        where: { id },
        data: { status: ExperienceApplicationStatus.COMPLETED, completedAt },
      });
      const remaining = await tx.experienceApplication.count({
        where: {
          experienceId: application.experienceId,
          status: {
            in: [
              ExperienceApplicationStatus.ACCEPTED,
              ExperienceApplicationStatus.IN_PROGRESS,
              ExperienceApplicationStatus.SUBMITTED,
            ],
          },
        },
      });
      if (!remaining)
        await tx.experienceOpportunity.update({
          where: { id: application.experienceId },
          data: { status: ExperienceOpportunityStatus.COMPLETED },
        });
      await tx.notification.create({
        data: {
          userId: application.candidate.userId,
          type: 'APPLICATION',
          title: 'Experiencia verificada',
          message: `Completaste ${application.experience.title}. Tu certificado ya está disponible.`,
          link: '/candidate/experiences',
        },
      });
      return { verifiedExperience: verified, certificate };
    });
  }

  async verify(code: string) {
    if (!/^CNK-EXP-[A-F0-9]{16}$/.test(code))
      throw new NotFoundException('Certificado no encontrado');
    const certificate = await this.prisma.experienceCertificate.findUnique({
      where: { code },
      include: {
        verifiedExperience: {
          include: {
            skills: { include: { skill: { select: { name: true, type: true } } } },
            application: {
              include: {
                candidate: { select: { firstName: true, lastName: true } },
                evaluation: {
                  select: {
                    compliance: true,
                    quality: true,
                    responsibility: true,
                    communication: true,
                    teamwork: true,
                    technicalSkills: true,
                    finalResult: true,
                  },
                },
                experience: { select: { professionalArea: true } },
              },
            },
          },
        },
      },
    });
    if (!certificate) throw new NotFoundException('Certificado no encontrado');
    const { verifiedExperience } = certificate;
    return {
      code: certificate.code,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      candidate:
        `${verifiedExperience.application.candidate.firstName ?? ''} ${verifiedExperience.application.candidate.lastName ?? ''}`.trim(),
      company: verifiedExperience.companyName,
      project: verifiedExperience.title,
      description: verifiedExperience.summary,
      startsAt: verifiedExperience.startsAt,
      completedAt: verifiedExperience.completedAt,
      durationWeeks: verifiedExperience.durationWeeks,
      professionalArea: verifiedExperience.application.experience.professionalArea,
      skills: verifiedExperience.skills.map(({ skill }) => skill),
      evaluation: verifiedExperience.application.evaluation,
    };
  }

  private async company(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) throw new NotFoundException('Perfil de empresa no encontrado');
    return company;
  }
  private async candidate(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } },
        educations: true,
        projects: true,
        verifiedExperiences: { include: { skills: true } },
      },
    });
    if (!candidate) throw new NotFoundException('Perfil de candidato no encontrado');
    return candidate;
  }
  private async companyApplication(userId: string, id: string) {
    const company = await this.company(userId);
    const item = await this.prisma.experienceApplication.findFirst({
      where: { id, experience: { companyId: company.id } },
      include: {
        candidate: true,
        submission: true,
        evaluation: true,
        experience: {
          include: {
            company: true,
            skills: { include: { skill: true } },
            applications: { select: { status: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Postulación no encontrada');
    return item;
  }
  private match(
    candidate: Awaited<ReturnType<ExperiencesService['candidate']>>,
    experience: {
      modality: string;
      professionalArea: string;
      skills: {
        skillId: string;
        priority: 'REQUIRED' | 'DESIRED';
        weight: number;
        skill: { id: string; name: string; slug: string; type: 'TECHNICAL' | 'SOFT' };
      }[];
    },
  ) {
    const base = calculateMatch(
      candidate,
      {
        modality: experience.modality,
        relatedCareers: [experience.professionalArea],
        skills: experience.skills,
      },
      DEFAULT_MATCHING_WEIGHTS,
    );
    const verifiedIds = new Set(
      candidate.verifiedExperiences.flatMap((item) => item.skills.map(({ skillId }) => skillId)),
    );
    const verifiedMatches = experience.skills
      .filter(({ skillId }) => verifiedIds.has(skillId))
      .map(({ skill }) => skill.name);
    const bonus = Math.min(3, verifiedMatches.length);
    return {
      ...base,
      score: Math.min(100, base.score + bonus),
      strengths: [...new Set([...base.strengths, ...verifiedMatches])],
      verifiedStrengths: verifiedMatches,
      verifiedEvidenceBonus: bonus,
    };
  }
  private publicWhere(query: ExperienceQueryDto) {
    return {
      status: ExperienceOpportunityStatus.PUBLISHED,
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: query.keyword, mode: Prisma.QueryMode.insensitive } },
              { professionalArea: { contains: query.keyword, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
      ...(query.city ? { city: { contains: query.city, mode: Prisma.QueryMode.insensitive } } : {}),
      ...(query.modality ? { modality: query.modality } : {}),
    };
  }
  private validateDates(dto: ExperienceOpportunityDto) {
    if (dto.deadline && dto.startsAt && new Date(dto.deadline) >= new Date(dto.startsAt))
      throw new BadRequestException('La fecha límite debe ser anterior al inicio');
  }
  private certificateCode() {
    return `CNK-EXP-${randomBytes(8).toString('hex').toUpperCase()}`;
  }
  private readonly publicInclude = {
    company: { select: { id: true, name: true, logoUrl: true, verificationStatus: true } },
    skills: { include: { skill: true }, orderBy: { weight: 'desc' as const } },
    _count: { select: { applications: true } },
  } as const;
  private readonly companyInclude = {
    ...this.publicInclude,
    applications: {
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, headline: true, userId: true },
        },
        submission: true,
        evaluation: true,
        verifiedExperience: {
          include: { certificate: true, skills: { include: { skill: true } } },
        },
      },
      orderBy: { compatibilityScore: 'desc' as const },
    },
  } as const;
}
