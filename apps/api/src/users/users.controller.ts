import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrivacyPreferencesDto } from './dto/privacy.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me/privacy')
  async privacy(@CurrentUser() auth: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: auth.id },
      select: {
        marketingConsent: true,
        termsAcceptedAt: true,
        termsVersion: true,
        privacyAcceptedAt: true,
        privacyVersion: true,
        majorityAgeConfirmedAt: true,
        deletionRequestedAt: true,
        candidateProfile: { select: { visibleToCompanies: true } },
        deletionRequests: {
          orderBy: { requestedAt: 'desc' },
          take: 1,
          select: { id: true, status: true, requestedAt: true, adminNote: true },
        },
      },
    });
    return {
      ...user,
      visibleToCompanies: user.candidateProfile?.visibleToCompanies ?? false,
      deletionRequest: user.deletionRequests[0] ?? null,
    };
  }

  @Patch('me/privacy')
  async updatePrivacy(@CurrentUser() auth: AuthUser, @Body() dto: PrivacyPreferencesDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.id },
        data: { marketingConsent: dto.marketingConsent },
      });
      if (auth.role === UserRole.CANDIDATE)
        await tx.candidateProfile.update({
          where: { userId: auth.id },
          data: { visibleToCompanies: dto.visibleToCompanies },
        });
      await tx.auditLog.create({ data: { userId: auth.id, action: 'PRIVACY_PREFERENCES_CHANGED', entity: 'User', entityId: auth.id, data: { marketingConsent: dto.marketingConsent, visibleToCompanies: dto.visibleToCompanies } } });
      return {
        marketingConsent: dto.marketingConsent,
        visibleToCompanies: auth.role === UserRole.CANDIDATE ? dto.visibleToCompanies : false,
      };
    });
  }

  @Get('me/export')
  exportData(@CurrentUser() auth: AuthUser) {
    void this.prisma.auditLog.create({ data: { userId: auth.id, action: 'PERSONAL_DATA_EXPORTED', entity: 'User', entityId: auth.id, data: {} } });
    return this.prisma.user.findUniqueOrThrow({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        termsAcceptedAt: true,
        termsVersion: true,
        privacyAcceptedAt: true,
        privacyVersion: true,
        marketingConsent: true,
        candidateProfile: {
          include: {
            skills: { include: { skill: true } },
            educations: true,
            projects: true,
            certifications: true,
            applications: { include: { vacancy: { select: { title: true } } } },
          },
        },
        companyProfile: { include: { vacancies: true } },
      },
    });
  }

  @Post('me/deletion-request')
  async requestDeletion(@CurrentUser() auth: AuthUser) {
    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId: auth.id, status: 'PENDING' },
    });
    if (existing) return existing;
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.accountDeletionRequest.create({ data: { userId: auth.id } });
      await tx.user.update({
        where: { id: auth.id },
        data: { deletionRequestedAt: request.requestedAt },
      });
      await tx.auditLog.create({ data: { userId: auth.id, action: 'DELETION_REQUESTED', entity: 'AccountDeletionRequest', entityId: request.id, data: {} } });
      return request;
    });
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios (solo administrador)' })
  findAll() {
    return this.prisma.user.findMany({
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
    });
  }
  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Métricas administrativas reales' })
  async dashboard() {
    const [users, candidates, companies, vacancies, applications, activeOpportunities] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: UserRole.CANDIDATE } }),
        this.prisma.user.count({ where: { role: UserRole.COMPANY } }),
        this.prisma.vacancy.count(),
        this.prisma.application.count(),
        this.prisma.vacancy.count({ where: { status: 'PUBLISHED' } }),
      ]);
    return { users, candidates, companies, vacancies, applications, activeOpportunities };
  }
}
