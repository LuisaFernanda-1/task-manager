/**
 * Script de línea de comandos: `npm run db:migrate`.
 * Crea o actualiza las tablas de la base de datos configurada en `.env`.
 */
import { closePool, getPool } from './database';
import { runMigrations } from './migrator';

async function main(): Promise<void> {
  try {
    const applied = await runMigrations(getPool());
    if (applied.length === 0) {
      console.log('La base de datos ya está al día. No hay migraciones pendientes.');
    } else {
      console.log(`Migraciones aplicadas: ${applied.join(', ')}`);
    }
  } finally {
    await closePool();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
