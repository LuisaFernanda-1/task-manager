import type { AuthUser } from '../api/middlewares/authenticate';

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado. Lo agrega el middleware `authenticate`. */
      user?: AuthUser;
    }
  }
}

export {};
