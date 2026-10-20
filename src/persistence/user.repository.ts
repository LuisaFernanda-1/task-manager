import type { Pool } from 'pg';
import { ConflictError } from '../errors';
import type { CreateUserData, User } from '../models/user';

const PG_UNIQUE_VIOLATION = '23505';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}

const USER_COLUMNS = 'id, nombre, email, password_hash, creado_en';

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>(
      `SELECT ${USER_COLUMNS} FROM usuarios WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

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
