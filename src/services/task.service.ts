import { NotFoundError } from '../errors';
import type { CreateTaskData, Task, TaskFilters, TaskStatus, UpdateTaskData } from '../models/task';
import type { TaskRepository } from '../persistence/task.repository';

/** Cuerpo aceptado por PUT /tasks/:id. Lo que no se envía vuelve a su valor por defecto. */
export interface ReplaceTaskInput {
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

/** Cuerpo aceptado por PATCH /tasks/:id. Solo se cambian los campos enviados. */
export interface UpdateTaskInput {
  titulo?: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

const TASK_NOT_FOUND = 'Tarea no encontrada';

/** Lógica de negocio de las tareas. Todas las operaciones están limitadas al usuario autenticado. */
export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}

  /** Crea una tarea asociada al usuario. */
  create(userId: string, input: CreateTaskData): Promise<Task> {
    return this.tasks.create(userId, {
      titulo: input.titulo.trim(),
      descripcion: cleanOptionalText(input.descripcion),
      fecha_vencimiento: input.fecha_vencimiento ?? null,
      estado: input.estado ?? 'pendiente',
    });
  }

  /** Devuelve solo las tareas del usuario, con filtros opcionales (`estado`, `vencidas`). */
  list(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    return this.tasks.findAllByUser(userId, filters);
  }

  /** @throws {NotFoundError} Si la tarea no existe o pertenece a otro usuario. */
  async getById(userId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findByIdForUser(taskId, userId);
    if (!task) throw new NotFoundError(TASK_NOT_FOUND);
    return task;
  }

  /** @throws {NotFoundError} Si la tarea no existe o pertenece a otro usuario. */
  async replace(userId: string, taskId: string, input: ReplaceTaskInput): Promise<Task> {
    const task = await this.tasks.replaceForUser(taskId, userId, {
      titulo: input.titulo.trim(),
      descripcion: cleanOptionalText(input.descripcion),
      fecha_vencimiento: input.fecha_vencimiento ?? null,
      estado: input.estado ?? 'pendiente',
    });
    if (!task) throw new NotFoundError(TASK_NOT_FOUND);
    return task;
  }

  /**
   * Actualiza parcialmente una tarea (PATCH). Solo pasa al repositorio los campos
   * enviados, con el título recortado igual que en `create`.
   * @param input Campos a cambiar; `null` en `descripcion` o `fecha_vencimiento` los borra.
   * @returns La tarea actualizada.
   * @throws {NotFoundError} Si la tarea no existe o pertenece a otro usuario.
   */
  async update(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
    const data: UpdateTaskData = {};
    if (input.titulo !== undefined) data.titulo = input.titulo.trim();
    if (input.descripcion !== undefined) data.descripcion = cleanOptionalText(input.descripcion);
    if (input.fecha_vencimiento !== undefined) data.fecha_vencimiento = input.fecha_vencimiento;
    if (input.estado !== undefined) data.estado = input.estado;

    const task = await this.tasks.updateForUser(taskId, userId, data);
    if (!task) throw new NotFoundError(TASK_NOT_FOUND);
    return task;
  }

  /** @throws {NotFoundError} Si la tarea no existe o pertenece a otro usuario. */
  async delete(userId: string, taskId: string): Promise<void> {
    const deleted = await this.tasks.deleteForUser(taskId, userId);
    if (!deleted) throw new NotFoundError(TASK_NOT_FOUND);
  }
}

/** Convierte cadenas vacías o de solo espacios en `null`. */
function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
