import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { ApplicationsService } from './applications.service';

@Module({ imports: [MatchingModule], providers: [ApplicationsService], exports: [ApplicationsService] })
export class ApplicationsModule {}
