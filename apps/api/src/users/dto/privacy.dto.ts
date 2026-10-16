import { IsBoolean } from 'class-validator';
export class PrivacyPreferencesDto {
  @IsBoolean() marketingConsent!: boolean;
  @IsBoolean() visibleToCompanies!: boolean;
}
