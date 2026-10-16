import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { MatchingModule } from '../matching/matching.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({ imports: [MatchingModule, ApplicationsModule], controllers: [CandidateController], providers: [CandidateService] })
export class CandidateModule {}
