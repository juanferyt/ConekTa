import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class ContributionRequestDto {
  @IsUUID() projectId!: string;
  @IsString() @Length(2, 120) validatorName!: string;
  @IsEmail() validatorEmail!: string;
  @IsString() @Length(2, 120) contributionRole!: string;
  @IsString() @Length(20, 2000) contributionSummary!: string;
  @IsArray() @ArrayUnique() @ArrayMaxSize(20) @IsUUID('4', { each: true }) skillIds!: string[];
}

export class ContributionDecisionDto {
  @IsBoolean() approved!: boolean;
}

export class PassportVisibilityDto {
  @IsOptional() @IsBoolean() active?: boolean;
}
