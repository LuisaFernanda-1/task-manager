import { AuthenticationError, ConflictError } from '../errors';
import { type PublicUser, toPublicUser } from '../models/user';
import type { UserRepository } from '../persistence/user.repository';
import type { PasswordHasher } from './password.service';
import type { TokenService } from './token.service';

/** Cuerpo de POST /auth/register. */
export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
}

/** Cuerpo de POST /auth/login. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Respuesta de un login correcto: el token y los datos públicos del usuario. */
export interface LoginResult {
  token: string;
  tipo: 'Bearer';
  expira_en: string;
  usuario: PublicUser;
}

/** Mensaje único para cualquier fallo de login: no revela si el email existe. */
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos';

/** Lógica de negocio de registro e inicio de sesión. */
export class AuthService {
  /** Hash de referencia para igualar tiempos cuando el email no existe (se calcula una vez). */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly tokenExpiresIn: string,
  ) {}

  /**
   * Registra un usuario nuevo guardando solo el hash de su contraseña.
   * @throws {ConflictError} Si el email ya está registrado.
   */
  async register(input: RegisterInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);

    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Ya existe un usuario registrado con ese email');
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({ nombre: input.nombre.trim(), email, passwordHash });
    return toPublicUser(user);
  }

  /**
   * Verifica las credenciales y devuelve un JWT.
   * @throws {AuthenticationError} Si el email no existe o la contraseña no coincide.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    if (!user) {
      // Se compara igual contra un hash ficticio para que la respuesta tarde lo
      // mismo exista o no el email; así no se puede adivinar qué emails están registrados.
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

/** Normaliza el email para que `Ana@Mail.com ` y `ana@mail.com` sean el mismo usuario. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
