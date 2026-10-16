import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { createHash, randomBytes } from 'node:crypto';
import { AccountTokenType } from '@prisma/client';
import { MailService } from '../mail/mail.service';

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email, passwordHash, role: dto.role,
            termsAcceptedAt: new Date(), termsVersion: '2026-08-21',
            privacyAcceptedAt: new Date(), privacyVersion: '2026-08-21',
            majorityAgeConfirmedAt: new Date(), marketingConsent: dto.marketingConsent,
          },
        });
        if (created.role === UserRole.CANDIDATE)
          await tx.candidateProfile.create({ data: { userId: created.id } });
        if (created.role === UserRole.COMPANY)
          await tx.companyProfile.create({ data: { userId: created.id } });
        return created;
      });
      await this.issueEmailToken(user.id, user.email, AccountTokenType.EMAIL_VERIFICATION);
      return this.createSession(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe una cuenta con este correo electrónico');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordValid = await this.passwords.verifyOrFake(dto.password, user?.passwordHash);
    if (!user || !passwordValid) {
      throw new UnauthorizedException('Correo electrónico o contraseña incorrectos');
    }
    if (!user.active) throw new UnauthorizedException('La cuenta está desactivada');
    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (payload.type !== 'refresh') throw new UnauthorizedException();
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (
        !user?.active ||
        !user.refreshTokenHash ||
        !(await this.passwords.verify(refreshToken, user.refreshTokenHash))
      ) {
        throw new UnauthorizedException();
      }
      return this.createSession(user);
    } catch {
      throw new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, active: true, emailVerified: true },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, active: true } });
    if (user?.active) await this.issueEmailToken(user.id, user.email, AccountTokenType.PASSWORD_RESET);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.validToken(token, AccountTokenType.PASSWORD_RESET);
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.accountToken.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new BadRequestException('El enlace ya fue utilizado');
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, refreshTokenHash: null } });
      await tx.accountToken.updateMany({ where: { userId: record.userId, type: AccountTokenType.PASSWORD_RESET, consumedAt: null }, data: { consumedAt: new Date() } });
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.validToken(token, AccountTokenType.EMAIL_VERIFICATION);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.accountToken.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new BadRequestException('El enlace ya fue utilizado');
      await tx.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
    });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
    if (!user || user.emailVerified) return;
    await this.issueEmailToken(userId, user.email, AccountTokenType.EMAIL_VERIFICATION);
  }

  private async issueEmailToken(userId: string, email: string, type: AccountTokenType): Promise<void> {
    const raw = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + (type === AccountTokenType.PASSWORD_RESET ? 30 : 24 * 60) * 60_000);
    await this.prisma.$transaction([
      this.prisma.accountToken.updateMany({ where: { userId, type, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.prisma.accountToken.create({ data: { userId, type, tokenHash: this.tokenHash(raw), expiresAt } }),
    ]);
    const webUrl = this.config.getOrThrow<string>('WEB_URL');
    const path = type === AccountTokenType.PASSWORD_RESET ? 'reset-password' : 'verify-email';
    const action = type === AccountTokenType.PASSWORD_RESET ? 'restablecer tu contraseña' : 'verificar tu correo';
    const url = `${webUrl}/${path}?token=${encodeURIComponent(raw)}`;
    try {
      await this.mail.send(email, `ConekTa: ${action}`, `Abre este enlace para ${action}: ${url}\nEl enlace expirará pronto. Si no solicitaste esta acción, ignora el mensaje.`, `<p>Hola,</p><p>Usa el siguiente enlace para ${action}:</p><p><a href="${url}">${action}</a></p><p>Si no solicitaste esta acción, ignora el mensaje.</p>`);
    } catch (error) {
      this.logger.error(`No fue posible enviar correo de ${type} a ${email}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private async validToken(raw: string, type: AccountTokenType) {
    const record = await this.prisma.accountToken.findUnique({ where: { tokenHash: this.tokenHash(raw) } });
    if (!record || record.type !== type || record.consumedAt || record.expiresAt <= new Date()) throw new BadRequestException('El enlace es inválido o expiró');
    return record;
  }

  private tokenHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }

  private async createSession(user: {
    id: string;
    email: string;
    role: UserRole;
    active: boolean;
    emailVerified: boolean;
  }): Promise<AuthResult> {
    const accessPayload: JwtPayload = { sub: user.id, role: user.role, type: 'access' };
    const refreshPayload: JwtPayload = { sub: user.id, role: user.role, type: 'refresh' };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      expiresIn: this.config.getOrThrow<string>('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await this.passwords.hash(refreshToken) },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        active: user.active,
        emailVerified: user.emailVerified,
      },
    };
  }
}
