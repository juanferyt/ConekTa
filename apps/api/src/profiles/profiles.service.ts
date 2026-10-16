import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(user: AuthUser) {
    if (user.role === UserRole.CANDIDATE) return this.prisma.candidateProfile.findUnique({ where: { userId: user.id } });
    if (user.role === UserRole.COMPANY) return this.prisma.companyProfile.findUnique({ where: { userId: user.id } });
    throw new BadRequestException('Los administradores no tienen un perfil público');
  }

  async updateMine(user: AuthUser, dto: UpdateProfileDto) {
    if (user.role === UserRole.CANDIDATE) {
      if (dto.name !== undefined || dto.description !== undefined || dto.website !== undefined) throw new BadRequestException('Campos no válidos para un perfil de candidato');
      return this.prisma.candidateProfile.update({ where: { userId: user.id }, data: { firstName: dto.firstName, lastName: dto.lastName, headline: dto.headline, city: dto.city } });
    }
    if (user.role === UserRole.COMPANY) {
      if (dto.firstName !== undefined || dto.lastName !== undefined || dto.headline !== undefined) throw new BadRequestException('Campos no válidos para un perfil de empresa');
      return this.prisma.companyProfile.update({ where: { userId: user.id }, data: { name: dto.name, description: dto.description, website: dto.website, city: dto.city } });
    }
    throw new NotFoundException('Perfil no disponible');
  }
}
