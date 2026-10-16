import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum PublicRegistrationRole {
  CANDIDATE = 'CANDIDATE',
  COMPANY = 'COMPANY',
}

export class RegisterDto {
  @ApiProperty({ example: 'persona@correo.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, format: 'password' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  @ApiProperty({ enum: PublicRegistrationRole })
  @IsEnum(PublicRegistrationRole, { message: 'Selecciona un tipo de cuenta válido' })
  role!: PublicRegistrationRole;

  @Equals(true, { message: 'Debes aceptar los términos y condiciones' })
  termsAccepted!: true;

  @Equals(true, { message: 'Debes autorizar el tratamiento de datos personales' })
  privacyAccepted!: true;

  @Equals(true, { message: 'Debes confirmar que eres mayor de edad' })
  majorityAgeConfirmed!: true;

  @IsOptional() @IsBoolean()
  marketingConsent = false;
}
