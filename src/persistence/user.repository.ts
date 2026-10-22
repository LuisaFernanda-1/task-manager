import type { Pool } from 'pg';
import { ConflictError } from '../errors';
import type { CreateUserData, User } from '../models/user';

/** Código de error de PostgreSQL para violación de restricción UNIQUE. */
const PG_UNIQUE_VIOLATION = '23505';

/** Contrato del repositorio de usuarios. Los servicios dependen de esta interfaz, no de PostgreSQL. */
export interface UserRepository {
  /** @returns El usuario con ese email (ya normalizado), o `null` si no existe. */
  findByEmail(email: string): Promise<User | null>;
  /**
   * Guarda un usuario nuevo.
   * @throws {ConflictError} Si el email ya está registrado.
   */
  create(data: CreateUserData): Promise<User>;
}

const USER_COLUMNS = 'id, nombre, email, password_hash, creado_en';

/** Implementación de {@link UserRepository} sobre PostgreSQL. */
export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Busca un usuario por email.
   * @param email Email ya normalizado (minúsculas, sin espacios).
   */
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>(
      `SELECT ${USER_COLUMNS} FROM usuarios WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

  /**
   * Inserta un usuario nuevo.
   * @throws {ConflictError} Si el email ya existe. Cubre el caso en que dos
   * registros simultáneos pasan la verificación previa del servicio.
   */
  async create(data: CreateUserData): Promise<User> {
    try {
      const { rows } = await this.pool.query<User>(
        `INSERT INTO usuarios (nombre, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING ${USER_COLUMNS}`,
        [data.nombre, data.email, data.passwordHash],
      );
      return rows[0] as User;
    } catch (error) {
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictError('Ya existe un usuario registrado con ese email');
      }
      throw error;
    }
  }
}
