import { Router } from 'express';
import type { AuthController } from '../../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';

/** Rutas públicas de autenticación, montadas en `/auth`. */
export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/login', validate({ body: loginSchema }), controller.login);

  return router;
}
