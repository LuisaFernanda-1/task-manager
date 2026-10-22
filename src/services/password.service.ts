import bcrypt from 'bcrypt';

/** Abstracción del hashing de contraseñas, para poder sustituirlo en las pruebas unitarias. */
export interface PasswordHasher {
  /** @returns El hash de la contraseña, listo para guardar. */
  hash(plain: string): Promise<string>;
  /** @returns `true` si la contraseña corresponde al hash. */
  compare(plain: string, hash: string): Promise<boolean>;
}

/** Implementación de {@link PasswordHasher} con bcrypt (incluye sal aleatoria en cada hash). */
export class BcryptPasswordHasher implements PasswordHasher {
  /** @param saltRounds Costo de bcrypt. Cada +1 duplica el tiempo de cálculo. */
  constructor(private readonly saltRounds: number) {}

  /** Genera un hash bcrypt con una sal aleatoria nueva. */
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  /** Compara en tiempo constante una contraseña con un hash bcrypt. */
  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
