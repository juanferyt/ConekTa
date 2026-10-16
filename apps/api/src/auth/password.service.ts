import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const DUMMY_HASH = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
const derive = (value: string, salt: string, length: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(value, salt, length, SCRYPT_OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

@Injectable()
export class PasswordService {
  async hash(value: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await derive(value, salt, 64);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(value: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;
    if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(hash)) return false;
    const storedBuffer = Buffer.from(hash, 'hex');
    const derivedKey = await derive(value, salt, storedBuffer.length);
    return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
  }

  verifyOrFake(value: string, storedHash?: string): Promise<boolean> {
    return this.verify(value, storedHash ?? DUMMY_HASH);
  }
}
