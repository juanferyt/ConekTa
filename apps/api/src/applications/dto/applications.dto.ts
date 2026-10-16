import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;
}

export class SendOfferDto {
  @IsInt() @Min(0) salary!: number;
  @IsString() @MaxLength(3) currency = 'COP';
  @IsDateString() startDate!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class OfferResponseDto {
  @IsIn([ApplicationStatus.OFFER_ACCEPTED, ApplicationStatus.OFFER_DECLINED]) status!: ApplicationStatus;
}

export class CompanyApplicationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vacancyId?: string;
  @ApiPropertyOptional({ enum: ['compatibility', 'date', 'name'] }) @IsOptional() @IsIn(['compatibility', 'date', 'name']) sort = 'date';
}
