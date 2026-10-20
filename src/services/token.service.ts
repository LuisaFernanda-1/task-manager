import jwt, { type SignOptions } from 'jsonwebtoken';
import { AuthenticationError } from '../errors';

export interface TokenPayload {
  sub: string;
  email: string;
}

const ALGORITHM = 'HS256';

export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: TokenPayload): string {
    const options: SignOptions = {
      algorithm: ALGORITHM,
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };
    return jwt.sign({ email: payload.email }, this.secret, { ...options, subject: payload.sub });
  }

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
