import type { Pool } from 'pg';
import type { CreateTaskData, ReplaceTaskData, Task, TaskFilters, UpdateTaskData } from '../models/task';

/**
 * Contrato del repositorio de tareas.
 *
 * Todos los métodos reciben el `userId` del dueño y lo incluyen en el WHERE.
 * Así la regla "solo el dueño accede a su tarea" se cumple en la misma
 * consulta, sin un paso previo de "buscar y luego comprobar".
 */
export interface TaskRepository {
  /** Crea una tarea para el usuario y la devuelve. */
  create(userId: string, data: CreateTaskData): Promise<Task>;
  /** Lista las tareas del usuario, con filtros opcionales. */
  findAllByUser(userId: string, filters?: TaskFilters): Promise<Task[]>;
  /** @returns La tarea, o `null` si no existe o no es del usuario. */
  findByIdForUser(id: string, userId: string): Promise<Task | null>;
  /** Reemplaza todos los campos (PUT). @returns `null` si no existe o no es del usuario. */
  replaceForUser(id: string, userId: string, data: ReplaceTaskData): Promise<Task | null>;
  /** Cambia solo los campos presentes (PATCH). @returns `null` si no existe o no es del usuario. */
  updateForUser(id: string, userId: string, data: UpdateTaskData): Promise<Task | null>;
  /** @returns `true` si se borró, `false` si no existe o no es del usuario. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
}

const TASK_COLUMNS =
  'id, usuario_id, titulo, descripcion, fecha_vencimiento, estado, creado_en, actualizado_en';

/**
 * Lista blanca de columnas que PATCH puede modificar. Los nombres de columna
 * no se pueden pasar como parámetros (`$1`), así que el SQL solo se arma con
 * nombres de esta lista y nunca con texto que venga del cliente.
 */
const UPDATABLE_COLUMNS = ['titulo', 'descripcion', 'fecha_vencimiento', 'estado'] as const;

/**
 * Una tarea está vencida si su momento de vencimiento ya pasó y no está completada.
 * Se compara con `NOW()` de PostgreSQL y no con la hora de Node: la columna es
 * `TIMESTAMPTZ`, así que la comparación es entre instantes y no depende de la
 * zona horaria del servidor ni del usuario.
 */
const OVERDUE_CONDITION =
  "(fecha_vencimiento IS NOT NULL AND fecha_vencimiento < NOW() AND estado <> 'completada')";

/** Implementación de {@link TaskRepository} sobre PostgreSQL. Usa siempre consultas parametrizadas. */
export class PgTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Inserta una tarea para el usuario. Si no se envía estado, queda `pendiente`.
   * @returns La tarea creada.
   */
  async create(userId: string, data: CreateTaskData): Promise<Task> {
    const { rows } = await this.pool.query<Task>(
      `INSERT INTO tareas (usuario_id, titulo, descripcion, fecha_vencimiento, estado)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'pendiente'))
       RETURNING ${TASK_COLUMNS}`,
      [userId, data.titulo, data.descripcion ?? null, data.fecha_vencimiento ?? null, data.estado ?? null],
    );
    return rows[0] as Task;
  }

  /**
   * Lista las tareas del usuario: primero las que vencen antes; las sin fecha al final.
   * @param filters `estado` y/o `vencidas`; se pueden combinar.
   */
  async findAllByUser(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const params: unknown[] = [userId];
    let where = 'usuario_id = $1';

    if (filters.estado) {
      params.push(filters.estado);
      where += ` AND estado = $${params.length}`;
    }

    if (filters.vencidas !== undefined) {
      where += filters.vencidas ? ` AND ${OVERDUE_CONDITION}` : ` AND NOT ${OVERDUE_CONDITION}`;
    }

    const { rows } = await this.pool.query<Task>(
      `SELECT ${TASK_COLUMNS} FROM tareas
       WHERE ${where}
       ORDER BY fecha_vencimiento ASC NULLS LAST, creado_en DESC`,
      params,
    );
    return rows;
  }

  /** @returns La tarea, o `null` si no existe o no es del usuario. */
  async findByIdForUser(id: string, userId: string): Promise<Task | null> {
    const { rows } = await this.pool.query<Task>(
      `SELECT ${TASK_COLUMNS} FROM tareas WHERE id = $1 AND usuario_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  /** @returns La tarea actualizada, o `null` si no existe o no es del usuario. */
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

  /**
   * Actualiza solo las columnas presentes en `data` (PATCH). El `SET` se arma con
   * {@link UPDATABLE_COLUMNS} y cada valor va como parámetro (`$3`, `$4`…).
   * @param data Campos a cambiar; `undefined` significa "no tocar".
   * @returns La tarea actualizada, o `null` si no existe o no es del usuario.
   */
  async updateForUser(id: string, userId: string, data: UpdateTaskData): Promise<Task | null> {
    const params: unknown[] = [id, userId];
    const sets: string[] = [];

    for (const column of UPDATABLE_COLUMNS) {
      if (data[column] !== undefined) {
        params.push(data[column]);
        sets.push(`${column} = $${params.length}`);
      }
    }

    if (sets.length === 0) return this.findByIdForUser(id, userId);

    const { rows } = await this.pool.query<Task>(
      `UPDATE tareas
       SET ${sets.join(', ')}, actualizado_en = NOW()
       WHERE id = $1 AND usuario_id = $2
       RETURNING ${TASK_COLUMNS}`,
      params,
    );
    return rows[0] ?? null;
  }

  /** @returns `true` si se borró la tarea, `false` si no existe o no es del usuario. */
  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM tareas WHERE id = $1 AND usuario_id = $2', [
      id,
      userId,
    ]);
    return (rowCount ?? 0) > 0;
  }
}
