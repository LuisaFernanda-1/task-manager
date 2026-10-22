import { NotFoundError } from '../errors';
import type { CreateTaskData, Task, TaskFilters, TaskStatus, UpdateTaskData } from '../models/task';
import type { TaskRepository } from '../persistence/task.repository';

export interface ReplaceTaskInput {
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

export interface UpdateTaskInput {
  titulo?: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

const TASK_NOT_FOUND = 'Tarea no encontrada';

export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}

  create(userId: string, input: CreateTaskData): Promise<Task> {
    return this.tasks.create(userId, {
      titulo: input.titulo.trim(),
      descripcion: cleanOptionalText(input.descripcion),
      fecha_vencimiento: input.fecha_vencimiento ?? null,
      estado: input.estado ?? 'pendiente',
    });
  }

  list(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    return this.tasks.findAllByUser(userId, filters);
  }

  async getById(userId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findByIdForUser(taskId, userId);
    if (!task) throw new NotFoundError(TASK_NOT_FOUND);
    return task;
  }

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

  async delete(userId: string, taskId: string): Promise<void> {
    const deleted = await this.tasks.deleteForUser(taskId, userId);
    if (!deleted) throw new NotFoundError(TASK_NOT_FOUND);
  }
}

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
