import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { AuthenticationError } from '../../src/errors';
import { TokenService } from '../../src/services/token.service';

const SECRET = 's'.repeat(32);
const service = new TokenService(SECRET, '1h');

describe('TokenService', () => {
  it('firma y verifica un token con el id del usuario en "sub"', () => {
    const token = service.sign({ sub: 'user-1', email: 'a@b.com' });
    expect(service.verify(token)).toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = new TokenService('o'.repeat(32), '1h').sign({ sub: 'user-1', email: 'a@b.com' });
    expect(() => service.verify(token)).toThrow(AuthenticationError);
  });

  it('rechaza un token expirado con un mensaje específico', () => {
    const token = jwt.sign({ email: 'a@b.com' }, SECRET, { subject: 'user-1', expiresIn: -10 });
    expect(() => service.verify(token)).toThrow(/expirado/);
  });

  it('rechaza un token sin firma (alg "none")', () => {
    const token = jwt.sign({ email: 'a@b.com' }, '', { subject: 'user-1', algorithm: 'none' });
    expect(() => service.verify(token)).toThrow(AuthenticationError);
  });

  it('rechaza un token al que le falta el "sub"', () => {
    const token = jwt.sign({ email: 'a@b.com' }, SECRET);
    expect(() => service.verify(token)).toThrow(AuthenticationError);
  });
});
