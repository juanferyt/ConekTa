import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import {
  TalentIntelligenceController,
  TalentPublicController,
} from './talent-intelligence.controller';
import { TalentIntelligenceService } from './talent-intelligence.service';

@Module({
  imports: [MailModule],
  controllers: [TalentIntelligenceController, TalentPublicController],
  providers: [TalentIntelligenceService],
  exports: [TalentIntelligenceService],
})
export class TalentIntelligenceModule {}
