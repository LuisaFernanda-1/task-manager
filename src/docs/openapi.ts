import { TASK_STATUSES } from '../models/task';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../api/schemas/auth.schemas';

const errorResponse = (description: string, example: Record<string, unknown>) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example } },
});

const unauthorized = errorResponse('Falta el token, es inválido o expiró', {
  error: { code: 'AUTHENTICATION_ERROR', message: 'Token inválido' },
});

const taskNotFound = errorResponse('La tarea no existe o pertenece a otro usuario', {
  error: { code: 'NOT_FOUND', message: 'Tarea no encontrada' },
});

const validationFailed = errorResponse('Los datos enviados no cumplen el esquema', {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Los datos enviados no son válidos',
    details: [{ field: 'body.titulo', message: 'Es obligatorio' }],
  },
});

const taskIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'UUID de la tarea',
  schema: { type: 'string', format: 'uuid' },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Task Manager API',
    version: '1.0.0',
    description:
      'API RESTful para gestionar tareas personales. Cada usuario se registra, inicia sesión ' +
      'y solo puede ver y modificar sus propias tareas.\n\n' +
      '**Cómo probarla:** registra un usuario, haz login, copia el `token` y pégalo en el botón **Authorize**.',
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'Auth', description: 'Registro e inicio de sesión' },
    { name: 'Tasks', description: 'CRUD de tareas (requiere token)' },
    { name: 'Health', description: 'Estado del servicio' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              message: { type: 'string', example: 'Tarea no encontrada' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { field: { type: 'string' }, message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['nombre', 'email', 'password'],
        additionalProperties: false,
        properties: {
          nombre: { type: 'string', minLength: 2, maxLength: 100, example: 'Luisa Ovallos' },
          email: { type: 'string', format: 'email', example: 'luisa@example.com' },
          password: {
            type: 'string',
            minLength: PASSWORD_MIN_LENGTH,
            maxLength: PASSWORD_MAX_LENGTH,
            format: 'password',
            example: 'MiClaveSegura123',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', example: 'luisa@example.com' },
          password: { type: 'string', format: 'password', example: 'MiClaveSegura123' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string', example: 'Luisa Ovallos' },
          email: { type: 'string', format: 'email', example: 'luisa@example.com' },
          creado_en: { type: 'string', format: 'date-time' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          tipo: { type: 'string', example: 'Bearer' },
          expira_en: { type: 'string', example: '1h' },
          usuario: { $ref: '#/components/schemas/User' },
        },
      },
      TaskInput: {
        type: 'object',
        required: ['titulo'],
        additionalProperties: false,
        properties: {
          titulo: { type: 'string', minLength: 1, maxLength: 150, example: 'Entregar prueba técnica' },
          descripcion: {
            type: 'string',
            maxLength: 2000,
            nullable: true,
            example: 'Subir el repositorio y grabar el video',
          },
          fecha_vencimiento: { type: 'string', format: 'date', nullable: true, example: '2026-10-23' },
          estado: { type: 'string', enum: [...TASK_STATUSES], default: 'pendiente', nullable: true },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          usuario_id: { type: 'string', format: 'uuid' },
          titulo: { type: 'string', example: 'Entregar prueba técnica' },
          descripcion: { type: 'string', nullable: true, example: 'Subir el repositorio y grabar el video' },
          fecha_vencimiento: { type: 'string', format: 'date', nullable: true, example: '2026-10-23' },
          estado: { type: 'string', enum: [...TASK_STATUSES], example: 'pendiente' },
          creado_en: { type: 'string', format: 'date-time' },
          actualizado_en: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica que la API y la base de datos respondan',
        responses: {
          '200': { description: 'Servicio operativo', content: { 'application/json': { example: { status: 'ok', database: 'ok' } } } },
          '503': { description: 'La base de datos no responde' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registra un usuario nuevo',
        description: 'La contraseña se guarda como hash bcrypt, nunca en texto plano.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          '201': { description: 'Usuario creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '400': validationFailed,
          '409': errorResponse('El email ya está registrado', {
            error: { code: 'CONFLICT', message: 'Ya existe un usuario registrado con ese email' },
          }),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Inicia sesión y devuelve un JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Credenciales correctas', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '400': validationFailed,
          '401': errorResponse('Email o contraseña incorrectos', {
            error: { code: 'AUTHENTICATION_ERROR', message: 'Email o contraseña incorrectos' },
          }),
        },
      },
    },
    '/tasks': {
      post: {
        tags: ['Tasks'],
        summary: 'Crea una tarea para el usuario autenticado',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          '201': { description: 'Tarea creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          '400': validationFailed,
          '401': unauthorized,
        },
      },
      get: {
        tags: ['Tasks'],
        summary: 'Lista las tareas del usuario autenticado',
        description: 'Ordenadas por fecha de vencimiento (las que no tienen fecha van al final).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'estado',
            in: 'query',
            required: false,
            description: 'Filtra por estado',
            schema: { type: 'string', enum: [...TASK_STATUSES] },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de tareas (solo las del usuario)',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } },
          },
          '400': validationFailed,
          '401': unauthorized,
        },
      },
    },
    '/tasks/{id}': {
      parameters: [taskIdParam],
      get: {
        tags: ['Tasks'],
        summary: 'Consulta una tarea propia',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'La tarea', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          '400': validationFailed,
          '401': unauthorized,
          '404': taskNotFound,
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Reemplaza una tarea propia',
        description:
          'PUT reemplaza el recurso completo: los campos opcionales que no se envíen vuelven a su valor ' +
          'por defecto (`descripcion` y `fecha_vencimiento` a `null`, `estado` a `pendiente`).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          '200': { description: 'Tarea actualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          '400': validationFailed,
          '401': unauthorized,
          '404': taskNotFound,
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Elimina una tarea propia',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Tarea eliminada' },
          '400': validationFailed,
          '401': unauthorized,
          '404': taskNotFound,
        },
      },
    },
  },
} as const;
