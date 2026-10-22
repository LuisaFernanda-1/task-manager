import { Pool } from 'pg';
import { Config } from '../config/env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = Config.getInstance();
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
