import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationError, ConflictError } from '../../src/errors';
import type { CreateUserData, User } from '../../src/models/user';
import type { UserRepository } from '../../src/persistence/user.repository';
import { AuthService } from '../../src/services/auth.service';
import type { PasswordHasher } from '../../src/services/password.service';
import { TokenService } from '../../src/services/token.service';

class InMemoryUserRepository implements UserRepository {
  users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user: User = {
      id: `id-${this.users.length + 1}`,
      nombre: data.nombre,
      email: data.email,
      password_hash: data.passwordHash,
      creado_en: new Date(),
    };
    this.users.push(user);
    return user;
  }
}

const fakeHasher: PasswordHasher = {
  hash: vi.fn(async (plain: string) => `hashed:${plain}`),
  compare: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
};

describe('AuthService', () => {
  let repo: InMemoryUserRepository;
  let tokens: TokenService;
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new InMemoryUserRepository();
    tokens = new TokenService('t'.repeat(32), '1h');
    service = new AuthService(repo, fakeHasher, tokens, '1h');
  });

  describe('register', () => {
    it('guarda el hash, no la contraseña en texto plano', async () => {
      await service.register({ nombre: 'Luisa', email: 'luisa@example.com', password: 'MiClave123' });
      expect(repo.users[0]?.password_hash).toBe('hashed:MiClave123');
      expect(repo.users[0]?.password_hash).not.toBe('MiClave123');
    });

    it('no devuelve el hash de la contraseña', async () => {
      const user = await service.register({ nombre: 'Luisa', email: 'luisa@example.com', password: 'MiClave123' });
      expect(user).not.toHaveProperty('password_hash');
    });

    it('normaliza el email a minúsculas', async () => {
      const user = await service.register({ nombre: 'Luisa', email: 'Luisa@Example.COM', password: 'MiClave123' });
      expect(user.email).toBe('luisa@example.com');
    });

    it('lanza ConflictError si el email ya existe (sin importar mayúsculas)', async () => {
      await service.register({ nombre: 'Luisa', email: 'luisa@example.com', password: 'MiClave123' });
      await expect(
        service.register({ nombre: 'Otra', email: 'LUISA@example.com', password: 'OtraClave123' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register({ nombre: 'Luisa', email: 'luisa@example.com', password: 'MiClave123' });
    });

    it('devuelve un token válido que identifica al usuario', async () => {
      const result = await service.login({ email: 'luisa@example.com', password: 'MiClave123' });
      expect(result.tipo).toBe('Bearer');
      expect(tokens.verify(result.token).sub).toBe(repo.users[0]?.id);
      expect(result.usuario).not.toHaveProperty('password_hash');
    });

    it('rechaza una contraseña incorrecta', async () => {
      await expect(service.login({ email: 'luisa@example.com', password: 'mala' })).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('usa el mismo mensaje para email inexistente y contraseña incorrecta', async () => {
      const wrongPassword = service.login({ email: 'luisa@example.com', password: 'mala' });
      const unknownEmail = service.login({ email: 'nadie@example.com', password: 'MiClave123' });
      const [a, b] = await Promise.allSettled([wrongPassword, unknownEmail]);
      expect((a as PromiseRejectedResult).reason.message).toBe((b as PromiseRejectedResult).reason.message);
    });

    it('compara contra un hash aunque el email no exista (evita ataques de tiempo)', async () => {
      vi.mocked(fakeHasher.compare).mockClear();
      await expect(service.login({ email: 'nadie@example.com', password: 'x' })).rejects.toThrow();
      expect(fakeHasher.compare).toHaveBeenCalledTimes(1);
    });
  });
});
