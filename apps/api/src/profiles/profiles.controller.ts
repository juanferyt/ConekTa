import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE, UserRole.COMPANY)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}
  @Get() @ApiOperation({ summary: 'Obtener mi perfil según el rol' }) getMine(@CurrentUser() user: AuthUser) { return this.profiles.getMine(user); }
  @Patch() @ApiOperation({ summary: 'Completar o actualizar mi perfil' }) updateMine(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) { return this.profiles.updateMine(user, dto); }
}
