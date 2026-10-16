import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExperienceApplicationStatus, VacancySkillPriority, WorkModality } from '@prisma/client';

export class ExperienceSkillDto {
  @IsUUID() skillId!: string;
  @IsEnum(VacancySkillPriority) priority!: VacancySkillPriority;
  @IsInt() @Min(1) @Max(5) weight!: number;
}

export class ExperienceOpportunityDto {
  @IsString() @Length(5, 120) title!: string;
  @IsString() @Length(30, 5000) description!: string;
  @IsString() @Length(10, 1500) objective!: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) activities!: string[];
  @IsString() @Length(2, 100) professionalArea!: string;
  @IsEnum(WorkModality) modality!: WorkModality;
  @IsOptional() @IsString() @Length(2, 100) city?: string;
  @IsInt() @Min(1) @Max(52) estimatedDurationWeeks!: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() deadline?: string;
  @IsInt() @Min(1) @Max(100) participantLimit!: number;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) expectedDeliverables!: string[];
  @IsArray()
  @ArrayUnique((skill: ExperienceSkillDto) => skill.skillId)
  @ValidateNested({ each: true })
  @Type(() => ExperienceSkillDto)
  skills!: ExperienceSkillDto[];
}

export class ExperienceApplyDto {
  @IsOptional() @IsString() @Length(10, 1000) motivation?: string;
}

export class ExperienceStatusDto {
  @IsEnum(ExperienceApplicationStatus) status!: ExperienceApplicationStatus;
}

export class ExperienceSubmissionDto {
  @IsString() @Length(30, 5000) workDescription!: string;
  @IsUrl({ require_protocol: true }) projectUrl!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) githubUrl?: string;
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_protocol: true }, { each: true })
  additionalLinks!: string[];
  @IsOptional() @IsString() @Length(0, 2000) comments?: string;
}

export class ExperienceEvaluationDto {
  @IsInt() @Min(1) @Max(5) compliance!: number;
  @IsInt() @Min(1) @Max(5) quality!: number;
  @IsInt() @Min(1) @Max(5) responsibility!: number;
  @IsInt() @Min(1) @Max(5) communication!: number;
  @IsInt() @Min(1) @Max(5) teamwork!: number;
  @IsInt() @Min(1) @Max(5) technicalSkills!: number;
  @IsInt() @Min(1) @Max(5) finalResult!: number;
  @IsString() @Length(10, 2000) companyComment!: string;
  @IsOptional() @IsString() @Length(0, 1000) recommendation?: string;
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) verifiedSkillIds!: string[];
}

export class ExperienceQueryDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsEnum(WorkModality) modality?: WorkModality;
}

export class VerifiedExperienceVisibilityDto {
  @IsBoolean() public!: boolean;
}
