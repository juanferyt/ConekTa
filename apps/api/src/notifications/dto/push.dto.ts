import { IsString, IsUrl, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString() @MinLength(20) @MaxLength(500) p256dh!: string;
  @IsString() @MinLength(8) @MaxLength(500) auth!: string;
}
export class PushSubscriptionDto {
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] }) @MaxLength(2000) endpoint!: string;
  @ValidateNested() @Type(() => PushKeysDto) keys!: PushKeysDto;
}
