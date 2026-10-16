import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ExperienceApplyDto,
  ExperienceEvaluationDto,
  ExperienceOpportunityDto,
  ExperienceQueryDto,
  ExperienceStatusDto,
  ExperienceSubmissionDto,
  VerifiedExperienceVisibilityDto,
} from './dto/experiences.dto';
import { ExperiencesService } from './experiences.service';

@ApiTags('ConekTa Experiencia')
@ApiBearerAuth()
@Controller('experiences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExperiencesController {
  constructor(private readonly service: ExperiencesService) {}
  @Get('company') @Roles(UserRole.COMPANY) companyList(@CurrentUser() user: AuthUser) {
    return this.service.companyList(user.id);
  }
  @Get('company/dashboard') @Roles(UserRole.COMPANY) companyDashboard(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.companyDashboard(user.id);
  }
  @Post('company') @Roles(UserRole.COMPANY) create(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExperienceOpportunityDto,
  ) {
    return this.service.create(user.id, dto);
  }
  @Get('company/:id') @Roles(UserRole.COMPANY) companyDetail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.companyDetail(user.id, id);
  }
  @Patch('company/:id') @Roles(UserRole.COMPANY) update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExperienceOpportunityDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
  @Post('company/:id/publish') @Roles(UserRole.COMPANY) publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.publish(user.id, id);
  }
  @Delete('company/:id') @Roles(UserRole.COMPANY) @HttpCode(HttpStatus.NO_CONTENT) async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.service.remove(user.id, id);
  }
  @Patch('company/applications/:id/status') @Roles(UserRole.COMPANY) applicationStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExperienceStatusDto,
  ) {
    return this.service.applicationStatus(user.id, id, dto.status);
  }
  @Post('company/applications/:id/evaluation') @Roles(UserRole.COMPANY) evaluate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExperienceEvaluationDto,
  ) {
    return this.service.evaluate(user.id, id, dto);
  }
  @Post('company/applications/:id/complete') @Roles(UserRole.COMPANY) complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.complete(user.id, id);
  }
  @Get('candidate') @Roles(UserRole.CANDIDATE) candidateList(
    @CurrentUser() user: AuthUser,
    @Query() query: ExperienceQueryDto,
  ) {
    return this.service.candidateList(user.id, query);
  }
  @Get('candidate/mine') @Roles(UserRole.CANDIDATE) mine(@CurrentUser() user: AuthUser) {
    return this.service.mine(user.id);
  }
  @Post('candidate/:id/apply') @Roles(UserRole.CANDIDATE) apply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExperienceApplyDto,
  ) {
    return this.service.apply(user.id, id, dto);
  }
  @Post('candidate/applications/:id/submission') @Roles(UserRole.CANDIDATE) submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ExperienceSubmissionDto,
  ) {
    return this.service.submit(user.id, id, dto);
  }
  @Patch('candidate/verified/:id/visibility') @Roles(UserRole.CANDIDATE) visibility(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerifiedExperienceVisibilityDto,
  ) {
    return this.service.visibility(user.id, id, dto.public);
  }
}

@ApiTags('ConekTa Experiencia pública')
@Controller()
export class PublicExperiencesController {
  constructor(private readonly service: ExperiencesService) {}
  @Get('experience-opportunities') list(@Query() query: ExperienceQueryDto) {
    return this.service.publicList(query);
  }
  @Get('experience-opportunities/:id') detail(@Param('id') id: string) {
    return this.service.publicDetail(id);
  }
  @Get('verify/:certificateCode') verify(@Param('certificateCode') code: string) {
    return this.service.verify(code);
  }
}
