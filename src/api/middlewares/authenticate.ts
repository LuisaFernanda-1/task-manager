import type { RequestHandler } from 'express';
import { AuthenticationError } from '../../errors';
import type { TokenService } from '../../services/token.service';

/** Usuario autenticado disponible en `req.user` dentro de las rutas protegidas. */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Middleware que protege rutas con JWT.
 *
 * Lee la cabecera `Authorization: Bearer <token>`, verifica firma y expiración
 * y, si es válido, guarda el usuario en `req.user`. Si no, responde 401.
 *
 * @param tokens Servicio con el que se verifican los tokens.
 */
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

/**
 * Devuelve el usuario autenticado de la petición.
 * @throws {AuthenticationError} Si se usa en una ruta sin el middleware `authenticate`.
 */
export function getAuthUser(req: Express.Request): AuthUser {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user;
}
