import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { PublicRegistrationRole } from '../src/auth/dto/register.dto';

const user = {
  id: 'user-1',
  email: 'candidate@conekta.test',
  passwordHash: 'stored-hash',
  role: UserRole.CANDIDATE,
  active: true,
  emailVerified: false,
  refreshTokenHash: 'refresh-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};
function setup(overrides: { found?: typeof user | null; passwordValid?: boolean } = {}) {
  const updates: unknown[] = [];
  const found = overrides.found === undefined ? user : overrides.found;
  const prisma = {
    $transaction: async (input: ((tx: any) => Promise<unknown>) | Promise<unknown>[]) =>
      Array.isArray(input) ? Promise.all(input) : input({
        user: { create: async () => user },
        candidateProfile: { create: async () => ({}) },
        companyProfile: { create: async () => ({}) },
      }),
    accountToken: { updateMany: async () => ({}), create: async () => ({}) },
    user: {
      findUnique: async () => found,
      update: async (args: unknown) => {
        updates.push(args);
        return user;
      },
    },
  };
  const jwt = {
    signAsync: async (payload: { type: string }) =>
      payload.type === 'access' ? 'access-token' : 'refresh-token',
    verifyAsync: async () => ({ sub: user.id, role: user.role, type: 'refresh' }),
  };
  const config = {
    getOrThrow: (key: string) =>
      key === 'WEB_URL' ? 'http://localhost:5174' : key === 'JWT_REFRESH_SECRET'
        ? 'r'.repeat(32)
        : key.includes('EXPIRES')
          ? '15m'
          : 'a'.repeat(32),
  };
  const passwords = {
    hash: async (value: string) => `hash:${value}`,
    verify: async () => true,
    verifyOrFake: async () => overrides.passwordValid ?? true,
  };
  const mail = { send: async () => undefined, enabled: true };
  return {
    service: new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      passwords,
      mail as never,
    ),
    updates,
  };
}

void describe('AuthService', () => {
  void it('registra un candidato sin exponer hashes ni refresh token en el usuario público', async () => {
    const { service, updates } = setup();
    const result = await service.register({
      email: user.email,
      password: 'SecurePassword123!',
      role: PublicRegistrationRole.CANDIDATE,
      termsAccepted: true,
      privacyAccepted: true,
      majorityAgeConfirmed: true,
      marketingConsent: false,
    });
    assert.equal(result.user.email, user.email);
    assert.equal('passwordHash' in result.user, false);
    assert.equal('refreshToken' in result.user, false);
    assert.equal(result.accessToken, 'access-token');
    assert.equal(updates.length, 1);
  });
  void it('usa una verificación uniforme y rechaza credenciales inválidas', async () => {
    const { service } = setup({ found: null, passwordValid: false });
    await assert.rejects(
      service.login({ email: 'missing@conekta.test', password: 'WrongPassword' }),
      UnauthorizedException,
    );
  });
  void it('rechaza usuarios inactivos aunque la contraseña sea válida', async () => {
    const { service } = setup({ found: { ...user, active: false }, passwordValid: true });
    await assert.rejects(
      service.login({ email: user.email, password: 'SecurePassword123!' }),
      UnauthorizedException,
    );
  });
  void it('rota refresh token solo para una sesión válida y activa', async () => {
    const { service, updates } = setup();
    const result = await service.refresh('valid-refresh');
    assert.equal(result.refreshToken, 'refresh-token');
    assert.equal(updates.length, 1);
  });
});
