import { FilePurpose } from '@prisma/client';
import { IsEnum, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateUploadDto {
  @IsString() @MaxLength(180) fileName!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) @Max(10 * 1024 * 1024) sizeBytes!: number;
  @IsEnum(FilePurpose) purpose!: FilePurpose;
}
export class ConfirmUploadDto { @IsString() @MaxLength(500) objectKey!: string; }
