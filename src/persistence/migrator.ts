import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';

/**
 * Carpeta de migraciones. Se resuelve igual desde `src/persistence` (tsx) y
 * desde `dist/persistence` (build), porque ambas están a dos niveles de la raíz.
 */
export const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');

/**
 * Aplica, en orden alfabético, los archivos `.sql` que aún no se han ejecutado.
 *
 * Cada migración corre dentro de una transacción y se registra en la tabla
 * `schema_migrations`, así que ejecutar el comando varias veces es seguro.
 *
 * @param pool Pool de conexiones a PostgreSQL.
 * @param dir Carpeta con los archivos de migración.
 * @returns Nombres de las migraciones aplicadas en esta ejecución.
 */
export async function runMigrations(pool: Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nombre     VARCHAR(255) PRIMARY KEY,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort();
  const { rows } = await pool.query<{ nombre: string }>('SELECT nombre FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.nombre));
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nombre) VALUES ($1)', [file]);
      await client.query('COMMIT');
      newlyApplied.push(file);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}
