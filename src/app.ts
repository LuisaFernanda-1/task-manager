import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Pool } from 'pg';
import swaggerUi from 'swagger-ui-express';
import { createAuthRouter } from './api/routes/auth.routes';
import { createTaskRouter } from './api/routes/task.routes';
import { errorHandler, notFoundHandler } from './api/middlewares/error-handler';
import type { Config } from './config/env';
import { AuthController } from './controllers/auth.controller';
import { TaskController } from './controllers/task.controller';
import { openApiSpec } from './docs/openapi';
import { PgTaskRepository } from './persistence/task.repository';
import { PgUserRepository } from './persistence/user.repository';
import { AuthService } from './services/auth.service';
import { BcryptPasswordHasher } from './services/password.service';
import { TaskService } from './services/task.service';
import { TokenService } from './services/token.service';

export interface AppDependencies {
  config: Config;
  pool: Pool;
}

export function createApp({ config, pool }: AppDependencies): Express {
  const tokenService = new TokenService(config.jwtSecret, config.jwtExpiresIn);
  const authService = new AuthService(
    new PgUserRepository(pool),
    new BcryptPasswordHasher(config.bcryptSaltRounds),
    tokenService,
    config.jwtExpiresIn,
  );
  const taskService = new TaskService(new PgTaskRepository(pool));

  const app = express();
  app.disable('x-powered-by');

  // swagger ui necesita scripts y estilos inline
  app.use('/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/docs.json', (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  app.use('/auth', createAuthRouter(new AuthController(authService)));
  app.use('/tasks', createTaskRouter(new TaskController(taskService), tokenService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
