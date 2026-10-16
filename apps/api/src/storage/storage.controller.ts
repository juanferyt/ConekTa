import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ConfirmUploadDto, CreateUploadDto } from './dto/storage.dto';
import { StorageService } from './storage.service';

@ApiTags('Files') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('files')
export class StorageController {
  constructor(private readonly storage: StorageService) {}
  @Post('upload-url') create(@CurrentUser() user: AuthUser, @Body() dto: CreateUploadDto) { return this.storage.createUpload(user, dto); }
  @Post('confirm') confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmUploadDto) { return this.storage.confirm(user.id, dto.objectKey); }
  @Get(':id/download-url') download(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.storage.downloadUrl(user, id); }
}
