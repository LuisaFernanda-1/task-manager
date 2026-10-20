import dotenv from 'dotenv';

export type NodeEnv = 'development' | 'production' | 'test';

const VALID_ENVS: readonly NodeEnv[] = ['development', 'production', 'test'];
const MIN_JWT_SECRET_LENGTH = 32;

export class Config {
  private static instance: Config | null = null;

  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly databaseUrl: string;
  readonly dbSsl: boolean;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptSaltRounds: number;

  private constructor(env: NodeJS.ProcessEnv) {
    this.nodeEnv = Config.parseNodeEnv(env.NODE_ENV);
    this.port = Config.parseInteger('PORT', env.PORT ?? '3000', 1, 65535);
    this.databaseUrl = Config.required('DATABASE_URL', env.DATABASE_URL);
    this.dbSsl = env.DB_SSL === 'true';
    this.jwtSecret = Config.required('JWT_SECRET', env.JWT_SECRET);
    this.jwtExpiresIn = env.JWT_EXPIRES_IN ?? '1h';
    this.bcryptSaltRounds = Config.parseInteger('BCRYPT_SALT_ROUNDS', env.BCRYPT_SALT_ROUNDS ?? '10', 4, 15);

    if (this.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres`);
    }

    Object.freeze(this);
  }

  static getInstance(): Config {
    if (!Config.instance) {
      const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
      dotenv.config({ path: envFile, quiet: true });
      Config.instance = new Config(process.env);
    }
    return Config.instance;
  }

  static resetForTests(): void {
    Config.instance = null;
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  private static required(name: string, value: string | undefined): string {
    if (value === undefined || value.trim() === '') {
      throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
    }
    return value.trim();
  }

  private static parseInteger(name: string, raw: string, min: number, max: number): number {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${name} debe ser un entero entre ${min} y ${max} (valor recibido: "${raw}")`);
    }
    return value;
  }

  private static parseNodeEnv(raw: string | undefined): NodeEnv {
    const value = (raw ?? 'development') as NodeEnv;
    if (!VALID_ENVS.includes(value)) {
      throw new Error(`NODE_ENV inválido: "${raw}". Valores permitidos: ${VALID_ENVS.join(', ')}`);
    }
    return value;
  }
}
