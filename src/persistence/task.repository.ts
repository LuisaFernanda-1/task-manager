import type { Pool } from 'pg';
import type { CreateTaskData, ReplaceTaskData, Task, TaskFilters } from '../models/task';

export interface TaskRepository {
  create(userId: string, data: CreateTaskData): Promise<Task>;
  findAllByUser(userId: string, filters?: TaskFilters): Promise<Task[]>;
  findByIdForUser(id: string, userId: string): Promise<Task | null>;
  replaceForUser(id: string, userId: string, data: ReplaceTaskData): Promise<Task | null>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
}

const TASK_COLUMNS =
  'id, usuario_id, titulo, descripcion, fecha_vencimiento, estado, creado_en, actualizado_en';

export class PgTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  async create(userId: string, data: CreateTaskData): Promise<Task> {
    const { rows } = await this.pool.query<Task>(
      `INSERT INTO tareas (usuario_id, titulo, descripcion, fecha_vencimiento, estado)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'pendiente'))
       RETURNING ${TASK_COLUMNS}`,
      [userId, data.titulo, data.descripcion ?? null, data.fecha_vencimiento ?? null, data.estado ?? null],
    );
    return rows[0] as Task;
  }

  async findAllByUser(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const params: unknown[] = [userId];
    let where = 'usuario_id = $1';

    if (filters.estado) {
      params.push(filters.estado);
      where += ` AND estado = $${params.length}`;
    }

    const { rows } = await this.pool.query<Task>(
      `SELECT ${TASK_COLUMNS} FROM tareas
       WHERE ${where}
       ORDER BY fecha_vencimiento ASC NULLS LAST, creado_en DESC`,
      params,
    );
    return rows;
  }

  async findByIdForUser(id: string, userId: string): Promise<Task | null> {
    const { rows } = await this.pool.query<Task>(
      `SELECT ${TASK_COLUMNS} FROM tareas WHERE id = $1 AND usuario_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async replaceForUser(id: string, userId: string, data: ReplaceTaskData): Promise<Task | null> {
    const { rows } = await this.pool.query<Task>(
      `UPDATE tareas
       SET titulo = $3, descripcion = $4, fecha_vencimiento = $5, estado = $6, actualizado_en = NOW()
       WHERE id = $1 AND usuario_id = $2
       RETURNING ${TASK_COLUMNS}`,
      [id, userId, data.titulo, data.descripcion, data.fecha_vencimiento, data.estado],
    );
    return rows[0] ?? null;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM tareas WHERE id = $1 AND usuario_id = $2', [
      id,
      userId,
    ]);
    return (rowCount ?? 0) > 0;
  }
}
