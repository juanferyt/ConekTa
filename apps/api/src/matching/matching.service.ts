import { Injectable, NotFoundException } from '@nestjs/common';
import { VacancyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateMatch, DEFAULT_MATCHING_WEIGHTS } from './matching.engine';
import { activeCertificateWhere } from '../experiences/certificate-evidence';

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendations(userId: string) {
    const candidate = await this.candidate(userId);
    const vacancies = await this.prisma.vacancy.findMany({
      where: { status: VacancyStatus.PUBLISHED, adminHidden: false },
      include: this.vacancyInclude,
    });
    return vacancies
      .map((vacancy) => ({
        ...vacancy,
        compatibility: this.withVerifiedEvidence(
          candidate,
          vacancy,
          calculateMatch(candidate, vacancy, DEFAULT_MATCHING_WEIGHTS),
        ),
      }))
      .sort(
        (a, b) =>
          b.compatibility.score - a.compatibility.score ||
          (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
      );
  }

  async vacancyMatch(userId: string, vacancyId: string) {
    const [candidate, vacancy] = await Promise.all([
      this.candidate(userId),
      this.prisma.vacancy.findFirst({
        where: { id: vacancyId, status: VacancyStatus.PUBLISHED, adminHidden: false },
        include: this.vacancyInclude,
      }),
    ]);
    if (!vacancy) throw new NotFoundException('Oportunidad no encontrada');
    return this.withVerifiedEvidence(
      candidate,
      vacancy,
      calculateMatch(candidate, vacancy, DEFAULT_MATCHING_WEIGHTS),
    );
  }

  private async candidate(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } },
        educations: true,
        projects: true,
        verifiedExperiences: { where: activeCertificateWhere, include: { skills: true } },
      },
    });
    if (!candidate) throw new NotFoundException('Perfil de candidato no encontrado');
    return candidate;
  }

  private withVerifiedEvidence(
    candidate: Awaited<ReturnType<MatchingService['candidate']>>,
    vacancy: { skills: { skillId: string; skill: { name: string } }[] },
    result: ReturnType<typeof calculateMatch>,
  ) {
    const verifiedIds = new Set(
      (candidate.verifiedExperiences ?? []).flatMap((experience) =>
        experience.skills.map(({ skillId }) => skillId),
      ),
    );
    const verifiedStrengths = [
      ...new Set(
        vacancy.skills
          .filter(({ skillId }) => verifiedIds.has(skillId))
          .map(({ skill }) => skill.name),
      ),
    ];
    const verifiedEvidenceBonus = Math.min(3, verifiedStrengths.length);
    return {
      ...result,
      score: Math.min(100, result.score + verifiedEvidenceBonus),
      strengths: [...new Set([...result.strengths, ...verifiedStrengths])],
      verifiedStrengths,
      verifiedEvidenceBonus,
    };
  }

  private readonly vacancyInclude = {
    company: {
      select: {
        id: true,
        name: true,
        logoUrl: true,
        city: true,
        sector: true,
        verificationStatus: true,
      },
    },
    skills: { include: { skill: true }, orderBy: { weight: 'desc' as const } },
    _count: { select: { applications: true } },
  } as const;
}
