import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PasswordService } from './password.service';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, AuthRateLimitService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard, PasswordService],
})
export class AuthModule {}
