import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({ controllers: [CommunicationsController], providers: [CommunicationsService, RealtimeGateway] })
export class CommunicationsModule {}
