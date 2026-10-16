import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpException } from '@nestjs/common';
import { AuthRateLimitService } from '../src/auth/auth-rate-limit.service';

void describe('AuthRateLimitService', () => {
  void it('bloquea intentos que superan el límite configurado', () => {
    const service = new AuthRateLimitService();
    service.consume('login:account:test', 2, 60_000);
    service.consume('login:account:test', 2, 60_000);
    assert.throws(() => service.consume('login:account:test', 2, 60_000), (error: unknown) => error instanceof HttpException && error.getStatus() === 429);
  });
});
