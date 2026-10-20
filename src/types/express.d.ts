import type { AuthUser } from '../api/middlewares/authenticate';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
