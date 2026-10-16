import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeletionRequestStatus, SkillType, UserRole, VacancyStatus, VerificationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
export class UsersQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}
export class CompaniesQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(VerificationStatus) verificationStatus?: VerificationStatus;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}
export class VacanciesQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(VacancyStatus) status?: VacancyStatus;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  hidden?: boolean;
}
export class ApplicationsQueryDto extends PaginationDto {
  @IsOptional() @IsString() vacancyId?: string;
}
export class SkillsQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(SkillType) type?: SkillType;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;
}
export class ActiveDto {
  @IsBoolean() active!: boolean;
}
export class HiddenDto {
  @IsBoolean() hidden!: boolean;
}
export class VerificationDto {
  @IsEnum(VerificationStatus) status!: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class DeletionReviewDto {
  @IsEnum(DeletionRequestStatus) status!: DeletionRequestStatus;
  @IsOptional() @IsString() @MaxLength(1000) adminNote?: string;
}
export class AdminSkillDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsEnum(SkillType) type!: SkillType;
  @IsBoolean() active!: boolean;
}
