// A fresh local schema protects demonstration data from the integration suite.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('No ejecutar en producción.');
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('La verificación académica requiere PostgreSQL local.');
  }
  const schema = `academic_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
  url.searchParams.set('schema', schema);
  url.searchParams.set('connect_timeout', '5');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch {
    throw new Error(
      'PostgreSQL local no accesible. Inicia el servicio del proyecto y repite npm run test:academic. No se ejecutaron migraciones ni pruebas.',
    );
  } finally {
    await prisma.$disconnect();
  }
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    JWT_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    MAIL_ENABLED: 'false',
    STORAGE_ENABLED: 'false',
    PUSH_ENABLED: 'false',
  };
  console.log(`Esquema de prueba aislado: ${schema}`);
  const cwd = path.resolve(__dirname, '../apps/api');
  const run = (args) => {
    const child = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
    if (child.error) throw new Error(`No fue posible iniciar el proceso: ${child.error.code}`);
    if (child.status !== 0) throw new Error(`Verificación detenida (salida ${child.status}).`);
  };
  run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
  run(['-r', require.resolve('ts-node/register'), '-e', "require('./test/core-flow.e2e.ts')"]);
  console.log(
    `Flujo integral aprobado. Se conserva el esquema ${schema} para inspección; no se alteró public.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
