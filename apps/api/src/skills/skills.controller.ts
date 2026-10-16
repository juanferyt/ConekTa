import { Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, SkillType, UserRole } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

class SkillDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsEnum(SkillType) type!: SkillType;
}

@ApiTags('Skills') @ApiBearerAuth() @Controller('skills') @UseGuards(JwtAuthGuard, RolesGuard)
export class SkillsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() findAll(@CurrentUser() user:AuthUser) { return this.prisma.skill.findMany({ where:user.role===UserRole.ADMIN?{}:{active:true}, orderBy: [{ type: 'asc' }, { category: 'asc' }, { name: 'asc' }] }); }
  @Post() @Roles(UserRole.ADMIN) async create(@Body() dto: SkillDto) { try { return await this.prisma.skill.create({ data: { ...dto, slug: this.slug(dto.name) } }); } catch (error) { this.handleConflict(error); } }
  @Patch(':id') @Roles(UserRole.ADMIN) async update(@Param('id') id: string, @Body() dto: SkillDto) { try { return await this.prisma.skill.update({ where: { id }, data: { ...dto, slug: this.slug(dto.name) } }); } catch (error) { this.handleConflict(error); } }
  @Delete(':id') @Roles(UserRole.ADMIN) @HttpCode(HttpStatus.NO_CONTENT) async delete(@Param('id') id: string) { await this.prisma.skill.delete({ where: { id } }); }
  private slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  private handleConflict(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Ya existe una habilidad con ese nombre'); throw error; }
}
