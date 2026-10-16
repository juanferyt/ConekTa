import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationStatus, SkillLevel, WorkModality, WorkSchedule } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

const trimArray = ({ value }: { value: unknown }) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : value;

export class UpdateCandidateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(1500) bio?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) photoUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) linkedinUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) githubUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) portfolioUrl?: string;
  @IsOptional() @IsBoolean() availableNow?: boolean;
  @IsOptional() @IsEnum(WorkSchedule) workSchedule?: WorkSchedule;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsEnum(WorkModality, { each: true }) modalities?: WorkModality[];
  @IsOptional() @Transform(trimArray) @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) @MaxLength(80, { each: true }) professionalInterests?: string[];
}

export class EducationDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(150) institution!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(150) program!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) academicLevel!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(20) semester?: number;
  @ApiProperty({ enum: EducationStatus }) @IsEnum(EducationStatus) status!: EducationStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() expectedGraduationDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() graduationDate?: Date;
}

export class CandidateSkillDto {
  @ApiProperty() @IsString() skillId!: string;
  @ApiProperty({ enum: SkillLevel }) @IsEnum(SkillLevel) level!: SkillLevel;
}

export class UpdateCandidateSkillDto {
  @ApiProperty({ enum: SkillLevel }) @IsEnum(SkillLevel) level!: SkillLevel;
}

export class ProjectDto {
  @IsString() @MinLength(2) @MaxLength(150) title!: string;
  @IsString() @MinLength(10) @MaxLength(2000) description!: string;
  @IsString() @MinLength(2) @MaxLength(120) role!: string;
  @Transform(trimArray) @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) technologies!: string[];
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) url?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) githubUrl?: string;
  @Type(() => Date) @IsDate() projectDate!: Date;
  @IsString() @MinLength(2) @MaxLength(80) projectType!: string;
  @IsBoolean() universityProject!: boolean;
}

export class CertificationDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsString() @MinLength(2) @MaxLength(150) issuingEntity!: string;
  @Type(() => Date) @IsDate() issuedAt!: Date;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) credentialUrl?: string;
}
