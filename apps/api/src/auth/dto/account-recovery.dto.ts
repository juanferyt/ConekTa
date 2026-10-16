import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class EmailDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
}
export class TokenDto { @IsString() @MinLength(32) @MaxLength(256) token!: string; }
export class ResetPasswordDto extends TokenDto {
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
}
