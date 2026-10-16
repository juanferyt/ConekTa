import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService, ApiInformation } from './app.service';

@ApiTags('API')
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Información general de la API' })
  getApiInformation(): ApiInformation {
    return this.appService.getApiInformation();
  }
}
