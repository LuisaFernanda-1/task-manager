import { Pool, types } from 'pg';
import { Config } from '../config/env';

const PG_DATE_OID = 1082;

// DATE como texto YYYY-MM-DD, sin conversión de zona horaria
types.setTypeParser(PG_DATE_OID, (value: string) => value);

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
