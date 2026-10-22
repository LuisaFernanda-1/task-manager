import type { JSONSchemaType } from 'ajv';
import { TASK_STATUSES, type TaskStatus } from '../../models/task';
import type { ReplaceTaskInput } from '../../services/task.service';

export interface ListTasksQuery {
  estado?: TaskStatus;
  vencidas?: 'true' | 'false';
}

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

export const taskIdParamsSchema: JSONSchemaType<{ id: string }> = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

export const listTasksQuerySchema: JSONSchemaType<ListTasksQuery> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    estado: { type: 'string', enum: [...TASK_STATUSES], nullable: true },
    vencidas: { type: 'string', enum: ['true', 'false'], nullable: true },
  },
};
