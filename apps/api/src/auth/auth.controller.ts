import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { EmailDto, ResetPasswordDto, TokenDto } from './dto/account-recovery.dto';

interface PublicAuthResponse {
  accessToken: string;
  user: AuthUser;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: AuthRateLimitService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar candidato o empresa' })
  @ApiCreatedResponse({ description: 'Cuenta y sesión creadas' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    this.limit(request, dto.email, 'register', 5);
    const result = await this.auth.register(dto);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    this.limit(request, dto.email, 'login', 10);
    const result = await this.auth.login(dto);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotar tokens de sesión usando cookie HttpOnly' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    const token = this.readCookie(request.headers.cookie, 'conekta_refresh');
    if (!token) throw new UnauthorizedException('Refresh token requerido');
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación sin revelar si el correo existe' })
  async forgotPassword(@Body() dto: EmailDto, @Req() request: Request): Promise<{ message: string }> {
    this.limit(request, dto.email, 'forgot-password', 4);
    await this.auth.requestPasswordReset(dto.email);
    return { message: 'Si existe una cuenta activa, enviaremos las instrucciones al correo registrado' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambiar contraseña mediante token de un solo uso' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request): Promise<void> {
    this.limit(request, 'token', 'reset-password', 6);
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verificar correo mediante token de un solo uso' })
  verifyEmail(@Body() dto: TokenDto): Promise<void> { return this.auth.verifyEmail(dto.token); }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reenviar verificación al usuario autenticado' })
  resendVerification(@CurrentUser() user: AuthUser): Promise<void> { return this.auth.resendVerification(user.id); }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar la sesión actual' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(user.id);
    response.clearCookie('conekta_refresh', { path: '/auth' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Usuario autenticado' })
  me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie('conekta_refresh', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/auth',
      maxAge: this.durationMs(this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN')),
    });
  }

  private readCookie(header: string | undefined, name: string): string | undefined {
    return header
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }

  private limit(request: Request, email: string, action: string, limit: number): void {
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const windowMs = 15 * 60 * 1000;
    this.rateLimit.consume(`${action}:ip:${ip}`, limit * 3, windowMs);
    this.rateLimit.consume(`${action}:account:${email}`, limit, windowMs);
  }

  private durationMs(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
    return Number(match[1]) * units[match[2] as keyof typeof units];
  }
}
