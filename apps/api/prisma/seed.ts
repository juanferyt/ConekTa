import { PrismaClient, UserRole } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function hashPassword(value: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(value, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD antes de ejecutar el seed');
  if (password.length < 12 || password.length > 72) throw new Error('ADMIN_PASSWORD debe tener entre 12 y 72 caracteres');

  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: UserRole.ADMIN, active: true, emailVerified: true },
    create: { email, passwordHash, role: UserRole.ADMIN, active: true, emailVerified: true },
  });
  process.stdout.write(`Administrador preparado: ${email}\n`);
}

main()
  .catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Error al ejecutar el seed'}\n`); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
