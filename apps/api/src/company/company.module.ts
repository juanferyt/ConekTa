import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { OpportunitiesController } from './opportunities.controller';
import { ApplicationsModule } from '../applications/applications.module';

@Module({ imports: [ApplicationsModule], controllers: [CompanyController, OpportunitiesController], providers: [CompanyService] })
export class CompanyModule {}
