import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional() @IsIn(['development', 'test', 'production']) NODE_ENV = 'development';
  @IsUrl({ require_tld: false, protocols: ['postgresql'] })
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  API_PORT = 3000;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  @Matches(/^\d+(s|m|h|d)$/)
  JWT_EXPIRES_IN = '1d';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @Matches(/^\d+(s|m|h|d)$/)
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsString()
  CORS_ORIGIN = 'http://localhost:5173';

  @IsOptional()
  @IsEmail()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  ADMIN_PASSWORD?: string;

  @IsUrl({ require_tld: false }) WEB_URL = 'http://localhost:5174';
  @IsOptional() @IsUrl({ require_tld: false }) PUBLIC_WEB_URL?: string;
  @IsOptional() @IsUrl({ require_tld: false }) PUBLIC_API_URL?: string;
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true') MAIL_ENABLED =
    false;
  @IsOptional() @IsString() SMTP_HOST?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) SMTP_PORT?: number;
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true') SMTP_SECURE =
    false;
  @IsOptional() @IsString() SMTP_USER?: string;
  @IsOptional() @IsString() SMTP_PASSWORD?: string;
  @IsOptional() @IsString() MAIL_FROM?: string;

  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  STORAGE_ENABLED = false;
  @IsOptional() @IsString() S3_REGION?: string;
  @IsOptional() @IsString() S3_BUCKET?: string;
  @IsOptional() @IsUrl({ require_tld: false }) S3_ENDPOINT?: string;
  @IsOptional() @IsString() S3_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() S3_SECRET_ACCESS_KEY?: string;
  @IsOptional() @IsUrl({ require_tld: false }) S3_PUBLIC_URL?: string;

  @Transform(({ value }: { value: unknown }) => value === true || value === 'true') PUSH_ENABLED =
    false;
  @IsOptional() @IsString() VAPID_SUBJECT?: string;
  @IsOptional() @IsString() VAPID_PUBLIC_KEY?: string;
  @IsOptional() @IsString() VAPID_PRIVATE_KEY?: string;
  @IsOptional() @IsString() TURN_URL?: string;
  @IsOptional() @IsString() TURN_USERNAME?: string;
  @IsOptional() @IsString() TURN_CREDENTIAL?: string;
}

export function envValidationSchema(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    validationError: { target: false, value: false },
  });
  const invalidOrigins =
    validated.CORS_ORIGIN?.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => {
        try {
          const url = new URL(origin);
          return !['http:', 'https:'].includes(url.protocol);
        } catch {
          return true;
        }
      }) ?? [];
  if (errors.length > 0 || invalidOrigins.length > 0)
    throw new Error(
      `Configuración de entorno inválida: ${errors.map((error) => error.property).join(', ') || 'CORS_ORIGIN'}`,
    );
  if (validated.JWT_SECRET === validated.JWT_REFRESH_SECRET)
    throw new Error('Configuración de entorno inválida: los secretos JWT deben ser diferentes');
  if (
    validated.NODE_ENV === 'production' &&
    (validated.JWT_SECRET.startsWith('replace_') ||
      validated.JWT_REFRESH_SECRET.startsWith('replace_'))
  )
    throw new Error('Configuración de entorno inválida: secretos JWT de ejemplo en producción');
  if (
    validated.MAIL_ENABLED &&
    (!validated.SMTP_HOST || !validated.SMTP_PORT || !validated.MAIL_FROM)
  )
    throw new Error(
      'Configuración de entorno inválida: SMTP_HOST, SMTP_PORT y MAIL_FROM son obligatorios cuando MAIL_ENABLED=true',
    );
  if (
    validated.STORAGE_ENABLED &&
    (!validated.S3_REGION ||
      !validated.S3_BUCKET ||
      !validated.S3_ACCESS_KEY_ID ||
      !validated.S3_SECRET_ACCESS_KEY ||
      !validated.S3_PUBLIC_URL)
  )
    throw new Error('Configuración de entorno inválida: configuración S3 incompleta');
  if (
    validated.PUSH_ENABLED &&
    (!validated.VAPID_SUBJECT || !validated.VAPID_PUBLIC_KEY || !validated.VAPID_PRIVATE_KEY)
  )
    throw new Error('Configuración de entorno inválida: configuración VAPID incompleta');
  return validated;
}
