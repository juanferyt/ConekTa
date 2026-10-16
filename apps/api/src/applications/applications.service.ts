import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma, VacancyStatus } from '@prisma/client';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CompanyApplicationsQueryDto } from './dto/applications.dto';
import {
  canCandidateRespondToOffer,
  canCandidateWithdraw,
  canCompanyTransition,
} from './application-state';
import type { SendOfferDto } from './dto/applications.dto';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly notifications: NotificationsService,
  ) {}

  async apply(userId: string, vacancyId: string) {
    const [candidate, vacancy, compatibility] = await Promise.all([
      this.candidate(userId),
      this.prisma.vacancy.findFirst({
        where: { id: vacancyId, status: VacancyStatus.PUBLISHED, adminHidden: false },
        select: { id: true, title: true, companyId: true, company: { select: { userId: true } } },
      }),
      this.matching.vacancyMatch(userId, vacancyId),
    ]);
    if (!vacancy) throw new NotFoundException('Oportunidad no disponible');
    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const application = await tx.application.create({
          data: {
            candidateId: candidate.id,
            vacancyId,
            companyId: vacancy.companyId,
            compatibilityScore: compatibility.score,
          },
        });
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            toStatus: ApplicationStatus.APPLIED,
            changedById: userId,
          },
        });
        return application;
      });
      await this.notifications.create(
        vacancy.company.userId,
        NotificationType.APPLICATION,
        'Nueva postulación',
        `Recibiste una postulación para ${vacancy.title}`,
        '/company/applications',
      );
      return application;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Ya te postulaste a esta oportunidad');
      throw error;
    }
  }

  async candidateApplications(userId: string) {
    const candidate = await this.candidate(userId);
    return this.prisma.application.findMany({
      where: { candidateId: candidate.id },
      include: {
        vacancy: { include: { company: { select: { id: true, name: true, logoUrl: true } } } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(userId: string, vacancyId: string) {
    const candidate = await this.candidate(userId);
    const application = await this.prisma.application.findUnique({
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId } },
    });
    if (!application) throw new NotFoundException('Postulación no encontrada');
    if (!canCandidateWithdraw(application.status))
      throw new BadRequestException('Esta postulación ya no se puede retirar');
    return this.changeStatus(
      application.id,
      application.status,
      ApplicationStatus.WITHDRAWN,
      userId,
    );
  }

  async companyApplications(userId: string, query: CompanyApplicationsQueryDto) {
    const company = await this.company(userId);
    const applications = await this.prisma.application.findMany({
      where: {
        companyId: company.id,
        candidate: { visibleToCompanies: true },
        ...(query.vacancyId ? { vacancyId: query.vacancyId } : {}),
      },
      include: this.applicationInclude,
      orderBy:
        query.sort === 'compatibility' ? { compatibilityScore: 'desc' } : { createdAt: 'desc' },
    });
    if (query.sort === 'name')
      applications.sort((a, b) =>
        `${a.candidate.firstName ?? ''} ${a.candidate.lastName ?? ''}`.localeCompare(
          `${b.candidate.firstName ?? ''} ${b.candidate.lastName ?? ''}`,
          'es',
        ),
      );
    return applications;
  }

  async companyApplication(userId: string, id: string) {
    const company = await this.company(userId);
    const application = await this.prisma.application.findFirst({
      where: { id, companyId: company.id, candidate: { visibleToCompanies: true } },
      include: this.applicationInclude,
    });
    if (!application) throw new NotFoundException('Postulación no encontrada');
    return application;
  }

  async candidateProfile(userId: string, candidateId: string) {
    const company = await this.company(userId);
    const hasApplication = await this.prisma.application.findFirst({
      where: { companyId: company.id, candidateId, candidate: { visibleToCompanies: true } },
      select: { id: true },
    });
    if (!hasApplication) throw new NotFoundException('Candidato no encontrado');
    return this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        educations: true,
        skills: { include: { skill: true } },
        projects: true,
        certifications: true,
        verifiedExperiences: {
          where: { public: true },
          include: { skills: { include: { skill: true } }, certificate: true },
          orderBy: { completedAt: 'desc' },
        },
      },
    });
  }

  async updateStatus(userId: string, id: string, next: ApplicationStatus) {
    const application = await this.companyApplication(userId, id);
    if (!canCompanyTransition(application.status, next))
      throw new BadRequestException(`No es posible cambiar de ${application.status} a ${next}`);
    await this.changeStatus(application.id, application.status, next, userId);
    const candidateUserId = application.candidate.user.id;
    await this.notifications.create(
      candidateUserId,
      NotificationType.APPLICATION,
      'Estado de postulación actualizado',
      `Tu proceso para ${application.vacancy.title} cambió a ${next}`,
      '/candidate/applications',
    );
    return this.companyApplication(userId, id);
  }

  async sendOffer(userId: string, id: string, dto: SendOfferDto) {
    const application = await this.companyApplication(userId, id);
    if (application.status !== ApplicationStatus.SELECTED)
      throw new BadRequestException('La oferta solo puede enviarse a una persona seleccionada');
    await this.prisma.application.update({
      where: { id },
      data: {
        offerSalary: dto.salary,
        offerCurrency: dto.currency,
        offeredStartDate: new Date(dto.startDate),
        offerNotes: dto.notes,
      },
    });
    await this.prisma.auditLog.create({ data: { userId, action: 'EMPLOYMENT_OFFER_SENT', entity: 'Application', entityId: id, data: { salary: dto.salary, currency: dto.currency, startDate: dto.startDate } } });
    return this.updateStatus(userId, id, ApplicationStatus.OFFER_SENT);
  }

  async respondToOffer(userId: string, id: string, next: ApplicationStatus) {
    const candidate = await this.candidate(userId);
    const application = await this.prisma.application.findFirst({
      where: { id, candidateId: candidate.id },
      include: { vacancy: { select: { title: true } }, company: { select: { userId: true } } },
    });
    if (!application) throw new NotFoundException('Postulación no encontrada');
    if (!canCandidateRespondToOffer(application.status, next))
      throw new BadRequestException('Esta oferta ya no admite esa respuesta');
    await this.changeStatus(id, application.status, next, userId);
    await this.prisma.auditLog.create({ data: { userId, action: 'EMPLOYMENT_OFFER_RESPONDED', entity: 'Application', entityId: id, data: { status: next } } });
    await this.notifications.create(
      application.company.userId,
      NotificationType.APPLICATION,
      'Respuesta a oferta',
      `La oferta para ${application.vacancy.title} fue ${next === ApplicationStatus.OFFER_ACCEPTED ? 'aceptada' : 'rechazada'}`,
      '/company/applications',
    );
    return this.candidateApplications(userId);
  }

  private changeStatus(
    id: string,
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    changedById: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.updateMany({
        where: { id, status: fromStatus },
        data: { status: toStatus },
      });
      if (updated.count !== 1)
        throw new ConflictException('La postulación cambió mientras la actualizabas');
      await tx.applicationStatusHistory.create({
        data: { applicationId: id, fromStatus, toStatus, changedById },
      });
      return tx.application.findUniqueOrThrow({ where: { id } });
    });
  }

  private async candidate(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!candidate) throw new NotFoundException('Perfil de candidato no encontrado');
    return candidate;
  }
  private async company(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Perfil de empresa no encontrado');
    return company;
  }
  private readonly applicationInclude = {
    vacancy: { select: { id: true, title: true } },
    candidate: {
      include: {
        user: { select: { id: true } },
        educations: { orderBy: { createdAt: 'desc' as const } },
        skills: { include: { skill: true } },
        projects: { orderBy: { projectDate: 'desc' as const } },
        certifications: true,
        verifiedExperiences: {
          where: { public: true },
          include: { skills: { include: { skill: true } }, certificate: true },
          orderBy: { completedAt: 'desc' as const },
        },
      },
    },
    statusHistory: { orderBy: { changedAt: 'asc' as const } },
  } as const;
}
