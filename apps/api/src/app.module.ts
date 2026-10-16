import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CandidateModule } from './candidate/candidate.module';
import { SkillsModule } from './skills/skills.module';
import { CompanyModule } from './company/company.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommunicationsModule } from './communications/communications.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { TalentIntelligenceModule } from './talent-intelligence/talent-intelligence.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'], validate: envValidationSchema }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    PrismaModule,
    MailModule,
    NotificationsModule,
    StorageModule,
    CommunicationsModule,
    ExperiencesModule,
    TalentIntelligenceModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    CandidateModule,
    SkillsModule,
    CompanyModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
