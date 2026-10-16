import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VacancyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  OpportunityQueryDto,
  UpdateCompanyProfileDto,
  VacancyDto,
  VerificationRequestDto,
} from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(userId: string) {
    const company = await this.company(userId);
    const [
      total,
      published,
      closed,
      applications,
      newApplications,
      underReview,
      interviews,
      selected,
      rankedApplications,
    ] = await Promise.all([
      this.prisma.vacancy.count({ where: { companyId: company.id } }),
      this.prisma.vacancy.count({
        where: { companyId: company.id, status: VacancyStatus.PUBLISHED, adminHidden: false },
      }),
      this.prisma.vacancy.count({ where: { companyId: company.id, status: VacancyStatus.CLOSED } }),
      this.prisma.application.count({ where: { vacancy: { companyId: company.id } } }),
      this.prisma.application.count({ where: { companyId: company.id, status: 'APPLIED' } }),
      this.prisma.application.count({ where: { companyId: company.id, status: 'UNDER_REVIEW' } }),
      this.prisma.application.count({ where: { companyId: company.id, status: 'INTERVIEW' } }),
      this.prisma.application.count({ where: { companyId: company.id, status: 'SELECTED' } }),
      this.prisma.application.findMany({
        where: {
          companyId: company.id,
          candidate: { visibleToCompanies: true },
          status: { notIn: ['REJECTED', 'WITHDRAWN'] },
        },
        select: {
          id: true,
          compatibilityScore: true,
          status: true,
          vacancy: { select: { id: true, title: true } },
          candidate: { select: { id: true, firstName: true, lastName: true, headline: true } },
        },
        orderBy: [{ vacancyId: 'asc' }, { compatibilityScore: 'desc' }],
      }),
    ]);
    const grouped = new Map<
      string,
      { vacancy: { id: string; title: string }; candidates: typeof rankedApplications }
    >();
    for (const application of rankedApplications) {
      const group = grouped.get(application.vacancy.id) ?? {
        vacancy: application.vacancy,
        candidates: [],
      };
      if (group.candidates.length < 3) group.candidates.push(application);
      grouped.set(application.vacancy.id, group);
    }
    return {
      company,
      metrics: {
        vacancies: total,
        published,
        active: published,
        closed,
        applications,
        newApplications,
        underReview,
        interviews,
        selected,
      },
      topCandidatesByVacancy: [...grouped.values()],
    };
  }

  async updateProfile(userId: string, dto: UpdateCompanyProfileDto) {
    const company = await this.company(userId);
    try {
      return await this.prisma.companyProfile.update({ where: { id: company.id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('El NIT ya está registrado');
      throw error;
    }
  }

  async requestVerification(userId: string, dto: VerificationRequestDto) {
    const company = await this.company(userId);
    if (!company.name || !company.nit || !company.contactEmail || !company.city || !company.country)
      throw new BadRequestException(
        'Completa nombre, NIT, correo, ciudad y país antes de solicitar la verificación',
      );
    if (company.verificationStatus === 'VERIFIED') return company;
    const result = await this.prisma.companyProfile.update({
      where: { id: company.id },
      data: {
        verificationStatus: 'PENDING',
        verificationRequestedAt: new Date(),
        verificationDocumentUrl: dto.documentUrl,
        verificationDocumentName: dto.documentName,
        verificationReason: null,
        verificationReviewedAt: null,
        verificationReviewedById: null,
      },
    });
    await this.prisma.auditLog.create({ data: { userId, action: 'COMPANY_VERIFICATION_REQUESTED', entity: 'CompanyProfile', entityId: company.id, data: { fileId: dto.documentUrl } } });
    return result;
  }

  async listVacancies(userId: string) {
    const company = await this.company(userId);
    return this.prisma.vacancy.findMany({
      where: { companyId: company.id },
      include: this.vacancyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  async vacancy(userId: string, id: string) {
    const company = await this.company(userId);
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id, companyId: company.id },
      include: this.vacancyInclude,
    });
    if (!vacancy) throw new NotFoundException('Vacante no encontrada');
    return vacancy;
  }

  async createVacancy(userId: string, dto: VacancyDto) {
    const company = await this.company(userId);
    this.validateSalary(dto);
    const { skills, ...data } = dto;
    return this.prisma.vacancy.create({
      data: {
        ...data,
        companyId: company.id,
        remote: dto.modality === 'REMOTO',
        skills: {
          create: skills.map((skill) => ({ ...skill, required: skill.priority === 'REQUIRED' })),
        },
      },
      include: this.vacancyInclude,
    });
  }

  async updateVacancy(userId: string, id: string, dto: VacancyDto) {
    await this.vacancy(userId, id);
    this.validateSalary(dto);
    const { skills, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      await tx.vacancySkill.deleteMany({ where: { vacancyId: id } });
      return tx.vacancy.update({
        where: { id },
        data: {
          ...data,
          remote: dto.modality === 'REMOTO',
          skills: {
            create: skills.map((skill) => ({ ...skill, required: skill.priority === 'REQUIRED' })),
          },
        },
        include: this.vacancyInclude,
      });
    });
  }

  async publish(userId: string, id: string) {
    const vacancy = await this.vacancy(userId, id);
    if (!vacancy.title || !vacancy.description)
      throw new BadRequestException('Completa la vacante antes de publicarla');
    return this.prisma.vacancy.update({
      where: { id },
      data: { status: VacancyStatus.PUBLISHED, publishedAt: new Date() },
    });
  }
  async close(userId: string, id: string) {
    await this.vacancy(userId, id);
    return this.prisma.vacancy.update({ where: { id }, data: { status: VacancyStatus.CLOSED } });
  }
  async delete(userId: string, id: string) {
    await this.vacancy(userId, id);
    return this.prisma.vacancy.delete({ where: { id } });
  }

  async applications(userId: string) {
    const company = await this.company(userId);
    return this.prisma.application.findMany({
      where: { vacancy: { companyId: company.id } },
      include: {
        vacancy: { select: { id: true, title: true } },
        candidate: { include: { skills: { include: { skill: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async publicOpportunities(query: OpportunityQueryDto) {
    return this.prisma.vacancy.findMany({
      where: {
        status: VacancyStatus.PUBLISHED,
        adminHidden: false,
        ...(query.keyword
          ? {
              OR: [
                { title: { contains: query.keyword, mode: 'insensitive' } },
                { description: { contains: query.keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
        ...(query.modality ? { modality: query.modality } : {}),
        ...(query.opportunityType ? { opportunityType: query.opportunityType } : {}),
      },
      include: this.vacancyInclude,
      orderBy: { publishedAt: 'desc' },
    });
  }
  async publicOpportunity(id: string) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id, status: VacancyStatus.PUBLISHED, adminHidden: false },
      include: this.vacancyInclude,
    });
    if (!vacancy) throw new NotFoundException('Oportunidad no encontrada');
    return vacancy;
  }

  private async company(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) throw new NotFoundException('Perfil de empresa no encontrado');
    return company;
  }
  private validateSalary(dto: VacancyDto) {
    if (dto.salaryMin !== undefined && dto.salaryMax !== undefined && dto.salaryMin > dto.salaryMax)
      throw new BadRequestException('El salario mínimo no puede superar el máximo');
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
