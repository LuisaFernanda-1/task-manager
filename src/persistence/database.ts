import { Pool } from 'pg';
import { Config } from '../config/env';

let pool: Pool | null = null;

/**
 * Devuelve el pool de conexiones compartido, creándolo en la primera llamada.
 * Un único pool por proceso evita abrir más conexiones de las necesarias.
 *
 * No hay parsers de tipos personalizados: `fecha_vencimiento` es `TIMESTAMPTZ`,
 * `pg` la convierte en `Date` y la respuesta JSON la serializa en ISO 8601 (UTC).
 */
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

/** Cierra el pool. Se usa al apagar el servidor y al terminar las pruebas. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
