import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanySize, OpportunityType, VacancySkillPriority, WorkModality, WorkSchedule } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

const trimArray = ({ value }: { value: unknown }) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : value;

export class UpdateCompanyProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(40) nit?: string;
  @IsOptional() @IsString() @MaxLength(120) sector?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(CompanySize) size?: CompanySize;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) website?: string;
  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(500) linkedinUrl?: string;
  @IsOptional() @IsEmail() @MaxLength(254) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class VerificationRequestDto {
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(1000) documentUrl!: string;
  @IsString() @MinLength(3) @MaxLength(180) documentName!: string;
}

export class VacancySkillDto {
  @ApiProperty() @IsString() skillId!: string;
  @ApiProperty({ enum: VacancySkillPriority }) @IsEnum(VacancySkillPriority) priority!: VacancySkillPriority;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) weight!: number;
}

export class VacancyDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(30) @MaxLength(5000) description!: string;
  @Transform(trimArray) @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) responsibilities!: string[];
  @Transform(trimArray) @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) requirements!: string[];
  @IsString() @MinLength(2) @MaxLength(120) city!: string;
  @IsEnum(WorkModality) modality!: WorkModality;
  @IsEnum(OpportunityType) opportunityType!: OpportunityType;
  @IsString() @MinLength(2) @MaxLength(100) contractType!: string;
  @IsOptional() @IsString() @MaxLength(120) department?: string;
  @IsEnum(WorkSchedule) workSchedule!: WorkSchedule;
  @IsOptional() @IsInt() @Min(1) @Max(48) weeklyHours?: number;
  @Transform(trimArray) @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) benefits!: string[];
  @IsBoolean() requiresUniversityAgreement = false;
  @IsOptional() @IsInt() @Min(0) salaryMin?: number;
  @IsOptional() @IsInt() @Min(0) salaryMax?: number;
  @IsString() @MinLength(3) @MaxLength(3) currency!: string;
  @IsBoolean() showSalary!: boolean;
  @IsOptional() @Type(() => Date) deadline?: Date;
  @Transform(trimArray) @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) relatedCareers!: string[];
  @IsInt() @Min(0) @Max(36) maxExperienceMonths = 0;
  @IsBoolean() experienceRequired = false;
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => VacancySkillDto) skills!: VacancySkillDto[];
}

export class OpportunityQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) keyword?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional({ enum: WorkModality }) @IsOptional() @IsEnum(WorkModality) modality?: WorkModality;
  @ApiPropertyOptional({ enum: OpportunityType }) @IsOptional() @IsEnum(OpportunityType) opportunityType?: OpportunityType;
}
