import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { OpportunityQueryDto } from './dto/company.dto';

@ApiTags('Opportunities') @Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly service: CompanyService) {}
  @Get() findAll(@Query() query: OpportunityQueryDto) { return this.service.publicOpportunities(query); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.publicOpportunity(id); }
}
