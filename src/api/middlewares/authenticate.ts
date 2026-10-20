import type { RequestHandler } from 'express';
import { AuthenticationError } from '../../errors';
import type { TokenService } from '../../services/token.service';

export interface AuthUser {
  id: string;
  email: string;
}

export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      throw new AuthenticationError('Falta la cabecera Authorization con el token');
    }

    const [scheme, token, ...rest] = header.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      throw new AuthenticationError('Formato de token inválido. Usa: Authorization: Bearer <token>');
    }

    const payload = tokens.verify(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  };
}

export function getAuthUser(req: Express.Request): AuthUser {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user;
}
