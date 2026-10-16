import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  ActiveDto,
  AdminSkillDto,
  ApplicationsQueryDto,
  CompaniesQueryDto,
  HiddenDto,
  PaginationDto,
  SkillsQueryDto,
  UsersQueryDto,
  VacanciesQueryDto,
  VerificationDto,
  DeletionReviewDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard') @ApiOperation({ summary: 'Métricas globales de administración' }) dashboard() {
    return this.service.dashboard();
  }
  @Get('users') users(@Query() query: UsersQueryDto) {
    return this.service.users(query);
  }
  @Get('users/:id') user(@Param('id') id: string) {
    return this.service.user(id);
  }
  @Patch('users/:id/status') userStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.service.setUserActive(admin.id, id, dto.active);
  }
  @Get('candidates') candidates(@Query() query: PaginationDto) {
    return this.service.candidates(query);
  }
  @Get('companies') companies(@Query() query: CompaniesQueryDto) {
    return this.service.companies(query);
  }
  @Patch('companies/:id/status') companyStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.service.setCompanyActive(admin.id, id, dto.active);
  }
  @Patch('companies/:id/verification') companyVerification(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerificationDto,
  ) {
    return this.service.verifyCompany(admin.id, id, dto.status, dto.reason);
  }
  @Get('deletion-requests') deletionRequests() {
    return this.service.deletionRequests();
  }
  @Patch('deletion-requests/:id') reviewDeletion(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeletionReviewDto,
  ) {
    return this.service.reviewDeletion(admin.id, id, dto.status, dto.adminNote);
  }
  @Get('vacancies') vacancies(@Query() query: VacanciesQueryDto) {
    return this.service.vacancies(query);
  }
  @Patch('vacancies/:id/visibility') vacancyVisibility(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: HiddenDto,
  ) {
    return this.service.hideVacancy(admin.id, id, dto.hidden);
  }
  @Get('applications') applications(@Query() query: ApplicationsQueryDto) {
    return this.service.applications(query);
  }
  @Get('skills') skills(@Query() query: SkillsQueryDto) {
    return this.service.skills(query);
  }
  @Post('skills') createSkill(@CurrentUser() admin: AuthUser, @Body() dto: AdminSkillDto) {
    return this.service.createSkill(admin.id, dto);
  }
  @Patch('skills/:id') updateSkill(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminSkillDto,
  ) {
    return this.service.updateSkill(admin.id, id, dto);
  }
  @Patch('skills/:id/status') skillStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.service.setSkillActive(admin.id, id, dto.active);
  }
  @Get('experiences') experiences() {
    return this.service.experiences();
  }
  @Get('experience-applications') experienceApplications() {
    return this.service.experienceApplications();
  }
  @Get('experience-certificates') experienceCertificates() {
    return this.service.experienceCertificates();
  }
  @Patch('experience-certificates/:id/revoke') revokeCertificate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.revokeExperienceCertificate(admin.id, id);
  }
}
