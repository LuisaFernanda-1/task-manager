import { createApp } from './app';
import { Config } from './config/env';
import { closePool, getPool } from './persistence/database';

/**
 * Punto de entrada: carga la configuración, comprueba la base de datos y
 * levanta el servidor HTTP. Maneja el apagado ordenado con SIGINT/SIGTERM.
 */
async function bootstrap(): Promise<void> {
  const config = Config.getInstance();
  const pool = getPool();

  await pool.query('SELECT 1');

  const app = createApp({ config, pool });
  const server = app.listen(config.port, () => {
    console.log(`API escuchando en http://localhost:${config.port}`);
    console.log(`Documentación Swagger en http://localhost:${config.port}/docs`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} recibido. Cerrando el servidor...`);
    server.close(() => {
      closePool()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  console.error('No se pudo iniciar la aplicación:', error instanceof Error ? error.message : error);
  process.exit(1);
});
