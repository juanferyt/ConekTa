import { Module } from '@nestjs/common';
import { ExperiencesController, PublicExperiencesController } from './experiences.controller';
import { ExperiencesService } from './experiences.service';

@Module({
  controllers: [ExperiencesController, PublicExperiencesController],
  providers: [ExperiencesService],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
