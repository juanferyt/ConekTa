import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CommunicationsService } from './communications.service';
import { ConversationDto, InterviewDto, InterviewStatusDto, MessageDto } from './dto/communications.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Communications') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.CANDIDATE, UserRole.COMPANY) @Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService, private readonly config: ConfigService) {}
  @Get('rtc-config') rtcConfig() { const url=this.config.get<string>('TURN_URL'); return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...(url ? [{ urls: url, username: this.config.get<string>('TURN_USERNAME'), credential: this.config.get<string>('TURN_CREDENTIAL') }] : [])] }; }
  @Get('conversations') conversations(@CurrentUser() user: AuthUser) { return this.service.conversations(user); }
  @Post('conversations') conversation(@CurrentUser() user: AuthUser, @Body() dto: ConversationDto) { return this.service.openConversation(user, dto.applicationId); }
  @Get('conversations/:id/messages') messages(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.messages(user, id); }
  @Post('conversations/:id/messages') send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MessageDto) { return this.service.send(user, id, dto); }
  @Get('interviews') interviews(@CurrentUser() user: AuthUser) { return this.service.interviews(user); }
  @Post('interviews') schedule(@CurrentUser() user: AuthUser, @Body() dto: InterviewDto) { return this.service.schedule(user, dto); }
  @Patch('interviews/:id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InterviewDto) { return this.service.updateInterview(user, id, dto); }
  @Patch('interviews/:id/status') status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InterviewStatusDto) { return this.service.interviewStatus(user, id, dto.status); }
}
