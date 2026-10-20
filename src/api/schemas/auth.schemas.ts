import type { JSONSchemaType } from 'ajv';
import type { LoginInput, RegisterInput } from '../../services/auth.service';

// bcrypt ignora lo que pase de 72 bytes
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MIN_LENGTH = 8;

export const registerSchema: JSONSchemaType<RegisterInput> = {
  type: 'object',
  additionalProperties: false,
  required: ['nombre', 'email', 'password'],
  properties: {
    nombre: { type: 'string', minLength: 2, maxLength: 100, pattern: '\\S' },
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
  },
};

export const loginSchema: JSONSchemaType<LoginInput> = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: 1, maxLength: PASSWORD_MAX_LENGTH },
  },
};
