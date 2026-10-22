/** Estados permitidos para una tarea. Fuente única para tipos, validación y Swagger. */
export const TASK_STATUSES = ['pendiente', 'en curso', 'completada'] as const;

/** Estado de una tarea: `pendiente`, `en curso` o `completada`. */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Tarea tal como la devuelve la API. */
export interface Task {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string | null;
  /**
   * Momento exacto de vencimiento (`TIMESTAMPTZ`), o `null` si la tarea no vence.
   * `pg` lo entrega como `Date` y la respuesta JSON lo serializa en ISO 8601 (UTC).
   */
  fecha_vencimiento: Date | null;
  estado: TaskStatus;
  creado_en: Date;
  actualizado_en: Date;
}

/**
 * Datos para crear una tarea. Los campos opcionales toman valores por defecto.
 * `fecha_vencimiento` llega como texto ISO 8601 con zona horaria.
 */
export interface CreateTaskData {
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento?: string | null;
  estado?: TaskStatus;
}

/**
 * Datos para reemplazar una tarea con PUT.
 * PUT reemplaza el recurso completo: lo que no se envía vuelve a su valor por defecto.
 */
export interface ReplaceTaskData {
  titulo: string;
  descripcion: string | null;
  fecha_vencimiento: string | null;
  estado: TaskStatus;
}

/**
 * Datos para actualizar una tarea con PATCH: solo se cambian los campos presentes.
 * Un campo en `null` (`descripcion`, `fecha_vencimiento`) se borra; uno ausente se conserva.
 */
export type UpdateTaskData = Partial<ReplaceTaskData>;

/** Filtros opcionales para listar tareas. */
export interface TaskFilters {
  estado?: TaskStatus;
  /**
   * `true`: solo tareas vencidas (fecha ya pasada y no completadas).
   * `false`: el resto (sin fecha, con fecha futura o completadas).
   */
  vencidas?: boolean;
}
