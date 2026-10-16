import { InterviewStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsIn, IsObject, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class ConversationDto { @IsString() applicationId!: string; }
export class MessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
  @IsOptional() @IsUrl({ require_tld: false, protocols: ['http', 'https'] }) @MaxLength(700) attachmentUrl?: string;
}
export class RealtimeMessageDto extends MessageDto { @IsString() conversationId!: string; }
export class RealtimeSignalDto { @IsString() conversationId!: string; @IsIn(['offer','answer','ice','hangup']) type!: 'offer'|'answer'|'ice'|'hangup'; @IsOptional() @IsObject() data?: object; }
export class TypingDto { @IsString() conversationId!: string; @IsBoolean() typing!: boolean; }
export class InterviewDto {
  @IsString() applicationId!: string;
  @Type(() => Date) @IsDate() startsAt!: Date;
  @Type(() => Date) @IsDate() endsAt!: Date;
  @IsString() @MinLength(2) @MaxLength(80) timezone!: string;
  @IsOptional() @IsString() @MaxLength(250) location?: string;
  @IsOptional() @IsUrl({ require_tld: false, protocols: ['http', 'https'] }) @MaxLength(700) meetingUrl?: string;
  @IsOptional() @IsString() @MaxLength(1500) notes?: string;
}
export class InterviewStatusDto { @IsEnum(InterviewStatus) status!: InterviewStatus; }
