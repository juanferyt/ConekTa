import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { PushSubscriptionDto } from './dto/push.dto';

@ApiTags('Notifications') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService, private readonly push: PushService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.notifications.list(user.id); }
  @Patch('read-all') @HttpCode(HttpStatus.NO_CONTENT) async readAll(@CurrentUser() user: AuthUser) { await this.notifications.readAll(user.id); }
  @Patch(':id/read') @HttpCode(HttpStatus.NO_CONTENT) async read(@CurrentUser() user: AuthUser, @Param('id') id: string) { await this.notifications.read(user.id, id); }
  @Get('push/public-key') pushKey() { return this.push.publicKey(); }
  @Post('push/subscriptions') subscribe(@CurrentUser() user: AuthUser, @Body() dto: PushSubscriptionDto, @Headers('user-agent') agent?: string) { return this.push.subscribe(user.id, dto.endpoint, dto.keys.p256dh, dto.keys.auth, agent); }
  @Delete('push/subscriptions') @HttpCode(HttpStatus.NO_CONTENT) async unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: PushSubscriptionDto) { await this.push.unsubscribe(user.id, dto.endpoint); }
}
