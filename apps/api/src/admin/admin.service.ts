import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  Prisma,
  UserRole,
  VacancyStatus,
  VerificationStatus,
  DeletionRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type {
  AdminSkillDto,
  ApplicationsQueryDto,
  CompaniesQueryDto,
  PaginationDto,
  SkillsQueryDto,
  UsersQueryDto,
  VacanciesQueryDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  async dashboard() {
    const [
      users,
      candidates,
      companies,
      activeCompanies,
      publishedVacancies,
      applications,
      selectedCandidates,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.CANDIDATE } }),
      this.prisma.user.count({ where: { role: UserRole.COMPANY } }),
      this.prisma.user.count({ where: { role: UserRole.COMPANY, active: true } }),
      this.prisma.vacancy.count({ where: { status: VacancyStatus.PUBLISHED, adminHidden: false } }),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { status: ApplicationStatus.SELECTED } }),
    ]);
    return {
      users,
      candidates,
      companies,
      activeCompanies,
      publishedVacancies,
      applications,
      selectedCandidates,
    };
  }
  users(query: UsersQueryDto) {
    return this.paginate(
      this.prisma.user,
      query,
      {
        ...(query.search
          ? { OR: [{ email: { contains: query.search, mode: 'insensitive' } }] }
          : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(query.active !== undefined ? { active: query.active } : {}),
      },
      {
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    );
  }
  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        candidateProfile: true,
        companyProfile: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
  async setUserActive(adminId: string, id: string, active: boolean) {
    if (adminId === id && !active)
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { active },
        select: { id: true, email: true, role: true, active: true },
      });
      await this.audit(tx, adminId, active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'User', id, {
        role: user.role,
      });
      return user;
    });
  }
  candidates(query: PaginationDto) {
    return this.paginate(
      this.prisma.candidateProfile,
      query,
      query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { headline: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {},
      {
        include: {
          user: { select: { email: true, active: true, createdAt: true } },
          _count: { select: { skills: true, projects: true, applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    );
  }
  companies(query: CompaniesQueryDto) {
    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { nit: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.active !== undefined ? { user: { active: query.active } } : {}),
    };
    return this.paginate(this.prisma.companyProfile, query, where, {
      include: {
        user: { select: { email: true, active: true, createdAt: true } },
        _count: { select: { vacancies: true, applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async setCompanyActive(adminId: string, id: string, active: boolean) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: company.userId }, data: { active } });
      const result = await tx.companyProfile.findUniqueOrThrow({
        where: { id },
        include: { user: { select: { email: true, active: true } } },
      });
      await this.audit(
        tx,
        adminId,
        active ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
        'CompanyProfile',
        id,
        {},
      );
      return result;
    });
  }
  async verifyCompany(adminId: string, id: string, status: VerificationStatus, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.companyProfile.update({
        where: { id },
        data: {
          verificationStatus: status,
          verificationReviewedAt: new Date(),
          verificationReviewedById: adminId,
          verificationReason: reason ?? null,
        },
      });
      await this.audit(tx, adminId, 'COMPANY_VERIFICATION_CHANGED', 'CompanyProfile', id, {
        status,
      });
      return company;
    });
  }

  deletionRequests() {
    return this.prisma.accountDeletionRequest.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
            createdAt: true,
            candidateProfile: { select: { firstName: true, lastName: true } },
            companyProfile: { select: { name: true } },
          },
        },
        reviewedBy: { select: { email: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async reviewDeletion(
    adminId: string,
    id: string,
    status: DeletionRequestStatus,
    adminNote?: string,
  ) {
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(status))
      throw new BadRequestException('Estado administrativo no válido');
    const deletedFiles = status === DeletionRequestStatus.COMPLETED ? await this.storage.deleteUserFiles(request.userId) : 0;
    return this.prisma.$transaction(async (tx) => {
      if (status === DeletionRequestStatus.COMPLETED) {
        const anonymousEmail = `deleted+${request.userId}@anon.conekta.local`;
        await tx.user.update({
          where: { id: request.userId },
          data: {
            email: anonymousEmail,
            active: false,
            refreshTokenHash: null,
            marketingConsent: false,
          },
        });
        await tx.candidateProfile.updateMany({
          where: { userId: request.userId },
          data: {
            firstName: null,
            lastName: null,
            phone: null,
            photoUrl: null,
            linkedinUrl: null,
            githubUrl: null,
            portfolioUrl: null,
            bio: null,
            visibleToCompanies: false,
          },
        });
        await tx.companyProfile.updateMany({
          where: { userId: request.userId },
          data: { contactEmail: null, phone: null, address: null },
        });
        await tx.accountToken.deleteMany({ where: { userId: request.userId } });
        await tx.pushSubscription.deleteMany({ where: { userId: request.userId } });
        await tx.notification.deleteMany({ where: { userId: request.userId } });
      }
      const result = await tx.accountDeletionRequest.update({
        where: { id },
        data: {
          status,
          adminNote,
          reviewedById: adminId,
          reviewedAt: new Date(),
          completedAt: status === DeletionRequestStatus.COMPLETED ? new Date() : null,
        },
      });
      await this.audit(tx, adminId, status === DeletionRequestStatus.COMPLETED ? 'ACCOUNT_ANONYMIZED' : 'DELETION_REQUEST_REVIEWED', 'AccountDeletionRequest', id, { status, deletedFiles });
      return result;
    });
  }
  vacancies(query: VacanciesQueryDto) {
    const where = {
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { company: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.hidden !== undefined ? { adminHidden: query.hidden } : {}),
    };
    return this.paginate(this.prisma.vacancy, query, where, {
      include: {
        company: {
          select: { id: true, name: true, user: { select: { email: true, active: true } } },
        },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async hideVacancy(adminId: string, id: string, hidden: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const vacancy = await tx.vacancy.update({ where: { id }, data: { adminHidden: hidden } });
      await this.audit(tx, adminId, hidden ? 'VACANCY_HIDDEN' : 'VACANCY_RESTORED', 'Vacancy', id, {
        status: vacancy.status,
      });
      return vacancy;
    });
  }
  applications(query: ApplicationsQueryDto) {
    const where = {
      ...(query.vacancyId ? { vacancyId: query.vacancyId } : {}),
      ...(query.search
        ? {
            OR: [
              { candidate: { user: { email: { contains: query.search, mode: 'insensitive' } } } },
              { vacancy: { title: { contains: query.search, mode: 'insensitive' } } },
              { company: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.paginate(this.prisma.application, query, where, {
      include: {
        candidate: {
          select: { firstName: true, lastName: true, user: { select: { email: true } } },
        },
        vacancy: { select: { title: true } },
        company: { select: { name: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  skills(query: SkillsQueryDto) {
    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    };
    return this.paginate(this.prisma.skill, query, where, {
      orderBy: [{ type: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
  }
  async createSkill(adminId: string, dto: AdminSkillDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const skill = await tx.skill.create({ data: { ...dto, slug: this.slug(dto.name) } });
        await this.audit(tx, adminId, 'SKILL_CREATED', 'Skill', skill.id, {
          name: skill.name,
          category: skill.category,
          type: skill.type,
          active: skill.active,
        });
        return skill;
      });
    } catch (error) {
      this.skillConflict(error);
    }
  }
  async updateSkill(adminId: string, id: string, dto: AdminSkillDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const skill = await tx.skill.update({
          where: { id },
          data: { ...dto, slug: this.slug(dto.name) },
        });
        await this.audit(tx, adminId, 'SKILL_UPDATED', 'Skill', id, {
          name: skill.name,
          category: skill.category,
          type: skill.type,
          active: skill.active,
        });
        return skill;
      });
    } catch (error) {
      this.skillConflict(error);
    }
  }
  async setSkillActive(adminId: string, id: string, active: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const skill = await tx.skill.update({ where: { id }, data: { active } });
      await this.audit(tx, adminId, active ? 'SKILL_ACTIVATED' : 'SKILL_DEACTIVATED', 'Skill', id, {
        name: skill.name,
      });
      return skill;
    });
  }
  experiences() {
    return this.prisma.experienceOpportunity.findMany({
      include: { company: { select: { name: true } }, _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  experienceApplications() {
    return this.prisma.experienceApplication.findMany({
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        experience: { select: { title: true, company: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  experienceCertificates() {
    return this.prisma.experienceCertificate.findMany({
      include: {
        verifiedExperience: {
          select: {
            title: true,
            companyName: true,
            candidate: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });
  }
  async revokeExperienceCertificate(adminId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const certificate = await tx.experienceCertificate.update({
        where: { id },
        data: { status: 'REVOKED', revokedAt: new Date(), revokedById: adminId },
      });
      await this.audit(tx, adminId, 'EXPERIENCE_CERTIFICATE_REVOKED', 'ExperienceCertificate', id, {
        code: certificate.code,
      });
      return certificate;
    });
  }
  // Prisma delegates expose different generated argument types; this adapter only adds server-side pagination to already constructed internal queries.
  private paginate(
    model: { findMany: (args: any) => Promise<any[]>; count: (args: any) => Promise<number> },
    query: PaginationDto,
    where: any,
    args: any,
  ) {
    const skip = (query.page - 1) * query.limit;
    return Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      model.findMany({ ...args, where, skip, take: query.limit }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      model.count({ where }),
    ]).then(([items, total]) => ({
      items,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    }));
  }
  private audit(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    data: Prisma.InputJsonObject,
  ) {
    return tx.auditLog.create({ data: { userId, action, entity, entityId, data } });
  }
  private slug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  private skillConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictException('Ya existe una habilidad con ese nombre');
    throw error;
  }
}
