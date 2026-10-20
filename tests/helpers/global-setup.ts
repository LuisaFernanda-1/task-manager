import { Config } from '../../src/config/env';
import { closePool, getPool } from '../../src/persistence/database';
import { runMigrations } from '../../src/persistence/migrator';

export default async function setup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  const config = Config.getInstance();
  if (!config.databaseUrl.includes('test')) {
    throw new Error('Por seguridad, DATABASE_URL de pruebas debe apuntar a una base cuyo nombre contenga "test"');
  }
  await runMigrations(getPool());
  await closePool();
}
