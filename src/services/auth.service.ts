import { AuthenticationError, ConflictError } from '../errors';
import { type PublicUser, toPublicUser } from '../models/user';
import type { UserRepository } from '../persistence/user.repository';
import type { PasswordHasher } from './password.service';
import type { TokenService } from './token.service';

export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  tipo: 'Bearer';
  expira_en: string;
  usuario: PublicUser;
}

const INVALID_CREDENTIALS = 'Email o contraseña incorrectos';

export class AuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly tokenExpiresIn: string,
  ) {}

  async register(input: RegisterInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);

    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Ya existe un usuario registrado con ese email');
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({ nombre: input.nombre.trim(), email, passwordHash });
    return toPublicUser(user);
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    if (!user) {
      // para que tarde lo mismo exista o no el email
      await this.hasher.compare(input.password, await this.getDummyHash());
      throw new AuthenticationError(INVALID_CREDENTIALS);
    }

    const valid = await this.hasher.compare(input.password, user.password_hash);
    if (!valid) {
      throw new AuthenticationError(INVALID_CREDENTIALS);
    }

    return {
      token: this.tokens.sign({ sub: user.id, email: user.email }),
      tipo: 'Bearer',
      expira_en: this.tokenExpiresIn,
      usuario: toPublicUser(user),
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('contraseña-de-referencia-para-tiempo-constante');
    return this.dummyHash;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
