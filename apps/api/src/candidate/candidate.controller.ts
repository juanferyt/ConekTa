import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CandidateService } from './candidate.service';
import { CandidateSkillDto, CertificationDto, EducationDto, ProjectDto, UpdateCandidateProfileDto, UpdateCandidateSkillDto } from './dto/candidate.dto';
import { MatchingService } from '../matching/matching.service';
import { ApplicationsService } from '../applications/applications.service';
import { OfferResponseDto } from '../applications/dto/applications.dto';

@ApiTags('Candidate') @ApiBearerAuth() @Controller('candidate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.CANDIDATE)
export class CandidateController {
  constructor(private readonly service: CandidateService, private readonly matching: MatchingService, private readonly applicationsService: ApplicationsService) {}
  @Get('profile') @ApiOperation({ summary: 'Perfil completo e indicador de completitud' }) dashboard(@CurrentUser() user: AuthUser) { return this.service.dashboard(user.id); }
  @Patch('profile') updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateCandidateProfileDto) { return this.service.updateProfile(user.id, dto); }
  @Post('educations') addEducation(@CurrentUser() user: AuthUser, @Body() dto: EducationDto) { return this.service.addEducation(user.id, dto); }
  @Patch('educations/:id') updateEducation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EducationDto) { return this.service.updateEducation(user.id, id, dto); }
  @Delete('educations/:id') @HttpCode(HttpStatus.NO_CONTENT) async deleteEducation(@CurrentUser() user: AuthUser, @Param('id') id: string) { await this.service.deleteEducation(user.id, id); }
  @Post('skills') addSkill(@CurrentUser() user: AuthUser, @Body() dto: CandidateSkillDto) { return this.service.addSkill(user.id, dto); }
  @Patch('skills/:skillId') updateSkill(@CurrentUser() user: AuthUser, @Param('skillId') skillId: string, @Body() dto: UpdateCandidateSkillDto) { return this.service.updateSkill(user.id, skillId, dto); }
  @Delete('skills/:skillId') @HttpCode(HttpStatus.NO_CONTENT) async deleteSkill(@CurrentUser() user: AuthUser, @Param('skillId') skillId: string) { await this.service.deleteSkill(user.id, skillId); }
  @Post('projects') addProject(@CurrentUser() user: AuthUser, @Body() dto: ProjectDto) { return this.service.addProject(user.id, dto); }
  @Patch('projects/:id') updateProject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ProjectDto) { return this.service.updateProject(user.id, id, dto); }
  @Delete('projects/:id') @HttpCode(HttpStatus.NO_CONTENT) async deleteProject(@CurrentUser() user: AuthUser, @Param('id') id: string) { await this.service.deleteProject(user.id, id); }
  @Post('certifications') addCertification(@CurrentUser() user: AuthUser, @Body() dto: CertificationDto) { return this.service.addCertification(user.id, dto); }
  @Patch('certifications/:id') updateCertification(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CertificationDto) { return this.service.updateCertification(user.id, id, dto); }
  @Delete('certifications/:id') @HttpCode(HttpStatus.NO_CONTENT) async deleteCertification(@CurrentUser() user: AuthUser, @Param('id') id: string) { await this.service.deleteCertification(user.id, id); }
  @Get('opportunities') opportunities() { return this.service.opportunities(); }
  @Get('recommendations') @ApiOperation({ summary: 'Vacantes publicadas ordenadas por compatibilidad explicable' }) recommendations(@CurrentUser() user: AuthUser) { return this.matching.recommendations(user.id); }
  @Get('matches/:vacancyId') @ApiOperation({ summary: 'Desglose de compatibilidad con una vacante' }) match(@CurrentUser() user: AuthUser, @Param('vacancyId') vacancyId: string) { return this.matching.vacancyMatch(user.id, vacancyId); }
  @Get('applications') applications(@CurrentUser() user: AuthUser) { return this.applicationsService.candidateApplications(user.id); }
  @Post('applications/:vacancyId') apply(@CurrentUser() user: AuthUser, @Param('vacancyId') vacancyId: string) { return this.applicationsService.apply(user.id, vacancyId); }
  @Delete('applications/:vacancyId') @HttpCode(HttpStatus.NO_CONTENT) async withdraw(@CurrentUser() user: AuthUser, @Param('vacancyId') vacancyId: string) { await this.applicationsService.withdraw(user.id, vacancyId); }
  @Patch('applications/:id/offer-response') respondToOffer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: OfferResponseDto) { return this.applicationsService.respondToOffer(user.id, id, dto.status); }
}
