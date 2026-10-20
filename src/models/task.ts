export const TASK_STATUSES = ['pendiente', 'en curso', 'completada'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_vencimiento: string | null;
  estado: TaskStatus;
  creado_en: Date;
  actualizado_en: Date;
}

export interface CreateTaskData {
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

export interface ReplaceTaskData {
  titulo: string;
  descripcion: string | null;
  fecha_vencimiento: string | null;
  estado: TaskStatus;
}

export interface TaskFilters {
  estado?: TaskStatus;
}
