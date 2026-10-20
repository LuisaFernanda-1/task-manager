import type { JSONSchemaType } from 'ajv';
import { TASK_STATUSES, type TaskFilters } from '../../models/task';
import type { ReplaceTaskInput } from '../../services/task.service';

export const taskBodySchema: JSONSchemaType<ReplaceTaskInput> = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo'],
  properties: {
    titulo: { type: 'string', minLength: 1, maxLength: 150, pattern: '\\S' },
    descripcion: { type: 'string', maxLength: 2000, nullable: true },
    fecha_vencimiento: { type: 'string', format: 'date', nullable: true },
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

export const listTasksQuerySchema: JSONSchemaType<TaskFilters> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    estado: { type: 'string', enum: [...TASK_STATUSES], nullable: true },
  },
};
