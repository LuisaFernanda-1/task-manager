import dotenv from 'dotenv';

/** Entornos de ejecución soportados por la aplicación. */
export type NodeEnv = 'development' | 'production' | 'test';

const VALID_ENVS: readonly NodeEnv[] = ['development', 'production', 'test'];
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Configuración centralizada de la aplicación (patrón Singleton).
 *
 * Lee las variables de entorno UNA sola vez, las valida y las expone tipadas
 * y de solo lectura. Si falta una variable obligatoria o tiene un valor
 * inválido, la aplicación falla al arrancar (fail fast) en lugar de fallar
 * más tarde en medio de una petición.
 *
 * @example
 * const config = Config.getInstance();
 * app.listen(config.port);
 */
export class Config {
  private static instance: Config | null = null;

  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly databaseUrl: string;
  readonly dbSsl: boolean;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptSaltRounds: number;

  /** El constructor es privado: la única forma de obtener la instancia es `getInstance()`. */
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

  /**
   * Devuelve la instancia única de la configuración, creándola la primera vez.
   * En la primera llamada carga el archivo `.env` (o `.env.test` cuando NODE_ENV=test).
   */
  static getInstance(): Config {
    if (!Config.instance) {
      const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
      dotenv.config({ path: envFile, quiet: true });
      Config.instance = new Config(process.env);
    }
    return Config.instance;
  }

  /**
   * Solo para pruebas unitarias: crea una configuración a partir de un objeto
   * de variables, sin leer archivos `.env` y sin tocar la instancia única.
   */
  static fromEnvForTesting(env: NodeJS.ProcessEnv): Config {
    return new Config(env);
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
