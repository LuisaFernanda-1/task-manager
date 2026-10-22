import type { JSONSchemaType, Schema } from 'ajv';
import { TASK_STATUSES, type TaskStatus } from '../../models/task';
import type { ReplaceTaskInput } from '../../services/task.service';

/**
 * Query string de GET /tasks tal como llega por HTTP. `vencidas` es texto
 * porque la validación no convierte tipos; el controlador lo pasa a booleano.
 */
export interface ListTasksQuery {
  estado?: TaskStatus;
  vencidas?: 'true' | 'false';
}

/**
 * Cuerpo de POST /tasks y PUT /tasks/:id. Ambos aceptan exactamente los mismos
 * campos: en PUT lo que no se envía vuelve a su valor por defecto.
 *
 * `fecha_vencimiento` usa `date-time`, que exige zona horaria (`Z` o `-05:00`):
 * sin ella no se sabe a qué instante se refiere y el filtro de vencidas fallaría.
 */
export const taskBodySchema: JSONSchemaType<ReplaceTaskInput> = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo'],
  properties: {
    titulo: { type: 'string', minLength: 1, maxLength: 150, pattern: '\\S' },
    descripcion: { type: 'string', maxLength: 2000, nullable: true },
    fecha_vencimiento: { type: 'string', format: 'date-time', nullable: true },
    estado: { type: 'string', enum: [...TASK_STATUSES], nullable: true },
  },
};

/**
 * Cuerpo de PATCH /tasks/:id: las mismas reglas que POST, pero todo opcional.
 *
 * - `minProperties: 1`: un cuerpo vacío responde 400.
 * - `descripcion` y `fecha_vencimiento` aceptan `null` para borrarlos.
 * - `titulo` y `estado` no aceptan `null`: son obligatorios en la tarea.
 *
 * Se tipa como `Schema` y no con `JSONSchemaType`, porque este último obliga a
 * marcar como `nullable` los campos opcionales y permitiría `titulo: null`.
 */
export const taskPatchSchema: Schema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    titulo: { type: 'string', minLength: 1, maxLength: 150, pattern: '\\S' },
    descripcion: { type: ['string', 'null'], maxLength: 2000 },
    fecha_vencimiento: { type: ['string', 'null'], format: 'date-time' },
    estado: { type: 'string', enum: [...TASK_STATUSES] },
  },
};

/** Parámetro de ruta `:id`: debe ser un UUID válido. */
export const taskIdParamsSchema: JSONSchemaType<{ id: string }> = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

/** Query string de GET /tasks: `estado` y `vencidas` (solo `"true"` o `"false"`). */
export const listTasksQuerySchema: JSONSchemaType<ListTasksQuery> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    estado: { type: 'string', enum: [...TASK_STATUSES], nullable: true },
    vencidas: { type: 'string', enum: ['true', 'false'], nullable: true },
  },
};
