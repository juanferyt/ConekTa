import { Injectable } from '@nestjs/common';

export interface ApiInformation {
  name: string;
  version: string;
  description: string;
  documentation: string;
}

@Injectable()
export class AppService {
  getApiInformation(): ApiInformation {
    return {
      name: 'ConekTa API',
      version: '1.0.0',
      description: 'Conectamos talento joven con su primera gran oportunidad.',
      documentation: '/docs',
    };
  }
}
