import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompanyService } from './company.service';
import { UpdateCompanyProfileDto, VacancyDto, VerificationRequestDto } from './dto/company.dto';
import { ApplicationsService } from '../applications/applications.service';
import { CompanyApplicationsQueryDto, SendOfferDto, UpdateApplicationStatusDto } from '../applications/dto/applications.dto';

@ApiTags('Company') @ApiBearerAuth() @Controller('company') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.COMPANY)
export class CompanyController {
  constructor(private readonly service: CompanyService, private readonly applicationsService: ApplicationsService) {}
  @Get('dashboard') dashboard(@CurrentUser() user: AuthUser) { return this.service.dashboard(user.id); }
  @Get('profile') profile(@CurrentUser() user: AuthUser) { return this.service.dashboard(user.id).then((result) => result.company); }
  @Patch('profile') updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateCompanyProfileDto) { return this.service.updateProfile(user.id, dto); }
  @Post('verification-request') requestVerification(@CurrentUser() user: AuthUser, @Body() dto: VerificationRequestDto) { return this.service.requestVerification(user.id, dto); }
  @Get('vacancies') vacancies(@CurrentUser() user: AuthUser) { return this.service.listVacancies(user.id); }
  @Get('vacancies/:id') vacancy(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.vacancy(user.id, id); }
  @Post('vacancies') create(@CurrentUser() user: AuthUser, @Body() dto: VacancyDto) { return this.service.createVacancy(user.id, dto); }
  @Patch('vacancies/:id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VacancyDto) { return this.service.updateVacancy(user.id, id, dto); }
  @Post('vacancies/:id/publish') publish(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.publish(user.id, id); }
  @Post('vacancies/:id/close') close(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.close(user.id, id); }
  @Delete('vacancies/:id') @HttpCode(HttpStatus.NO_CONTENT) async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) { await this.service.delete(user.id, id); }
  @Get('applications') applications(@CurrentUser() user: AuthUser, @Query() query: CompanyApplicationsQueryDto) { return this.applicationsService.companyApplications(user.id, query); }
  @Get('applications/:id') application(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.applicationsService.companyApplication(user.id, id); }
  @Patch('applications/:id/status') updateApplicationStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) { return this.applicationsService.updateStatus(user.id, id, dto.status); }
  @Post('applications/:id/offer') sendOffer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendOfferDto) { return this.applicationsService.sendOffer(user.id, id, dto); }
  @Get('candidates/:candidateId') candidate(@CurrentUser() user: AuthUser, @Param('candidateId') candidateId: string) { return this.applicationsService.candidateProfile(user.id, candidateId); }
}
