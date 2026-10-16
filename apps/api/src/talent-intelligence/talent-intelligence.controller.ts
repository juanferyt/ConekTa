import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ContributionDecisionDto,
  ContributionRequestDto,
  PassportVisibilityDto,
} from './dto/talent-intelligence.dto';
import { TalentIntelligenceService } from './talent-intelligence.service';

@ApiTags('Talent Intelligence')
@ApiBearerAuth()
@Controller('talent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TalentIntelligenceController {
  constructor(private readonly service: TalentIntelligenceService) {}
  @Get('candidate/evidence')
  @Roles(UserRole.CANDIDATE)
  @ApiOperation({ summary: 'Puntuación explicable de evidencias por habilidad' })
  evidence(@CurrentUser() user: AuthUser) {
    return this.service.evidence(user.id);
  }
  @Get('candidate/improvement-route/:vacancyId') @Roles(UserRole.CANDIDATE) route(
    @CurrentUser() user: AuthUser,
    @Param('vacancyId') vacancyId: string,
  ) {
    return this.service.improvementRoute(user.id, vacancyId);
  }
  @Get('candidate/contributions') @Roles(UserRole.CANDIDATE) contributions(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.contributions(user.id);
  }
  @Post('candidate/contributions') @Roles(UserRole.CANDIDATE) requestContribution(
    @CurrentUser() user: AuthUser,
    @Body() dto: ContributionRequestDto,
  ) {
    return this.service.requestContribution(user.id, dto);
  }
  @Get('candidate/passport') @Roles(UserRole.CANDIDATE) passport(@CurrentUser() user: AuthUser) {
    return this.service.passport(user.id);
  }
  @Patch('candidate/passport') @Roles(UserRole.CANDIDATE) passportVisibility(
    @CurrentUser() user: AuthUser,
    @Body() dto: PassportVisibilityDto,
  ) {
    return this.service.passportVisibility(user.id, dto.active ?? true);
  }
  @Get('company/opportunity-index') @Roles(UserRole.COMPANY) companyIndex(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.companyIndexForOwner(user.id);
  }
  @Get('company/opportunity-index/:companyId')
  @Roles(UserRole.CANDIDATE, UserRole.COMPANY, UserRole.ADMIN)
  index(@Param('companyId') companyId: string) {
    return this.service.companyIndex(companyId);
  }
}

@ApiTags('Talent Intelligence público')
@Controller()
export class TalentPublicController {
  constructor(private readonly service: TalentIntelligenceService) {}
  @Get('passport/:code') passport(@Param('code') code: string) {
    return this.service.publicPassport(code);
  }
  @Get('passport/:code/open-badge') openBadge(@Param('code') code: string) {
    return this.service.openBadge(code);
  }
  @Get('contributions/validate/:token') validation(@Param('token') token: string) {
    return this.service.contributionPreview(token);
  }
  @Post('contributions/validate/:token') decide(
    @Param('token') token: string,
    @Body() dto: ContributionDecisionDto,
  ) {
    return this.service.validateContribution(token, dto.approved);
  }
}
