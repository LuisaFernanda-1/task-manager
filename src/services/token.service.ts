import jwt, { type SignOptions } from 'jsonwebtoken';
import { AuthenticationError } from '../errors';

/** Datos que viajan dentro del JWT. Solo identificadores, nunca información sensible. */
export interface TokenPayload {
  /** Id del usuario (claim estándar `sub`). */
  sub: string;
  email: string;
}

/** Algoritmo fijo: se pasa también al verificar para rechazar tokens firmados con otro (p. ej. `none`). */
const ALGORITHM = 'HS256';

/** Emite y verifica JSON Web Tokens. */
export class TokenService {
  /**
   * @param secret Secreto con el que se firman los tokens.
   * @param expiresIn Duración del token en formato de la librería `ms` (por ejemplo `1h`).
   */
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  /** Firma un token para el usuario indicado. */
  sign(payload: TokenPayload): string {
    const options: SignOptions = {
      algorithm: ALGORITHM,
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };
    return jwt.sign({ email: payload.email }, this.secret, { ...options, subject: payload.sub });
  }

  /**
   * Verifica la firma y la expiración del token.
   * @throws {AuthenticationError} Si el token está vencido, mal formado o firmado con otro secreto.
   */
  verify(token: string): TokenPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, this.secret, { algorithms: [ALGORITHM] });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('El token ha expirado, inicia sesión de nuevo');
      }
      throw new AuthenticationError('Token inválido');
    }

    if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
      throw new AuthenticationError('Token inválido');
    }
    return { sub: decoded.sub, email: decoded.email };
  }
}
