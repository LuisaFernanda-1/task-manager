import type { JSONSchemaType } from 'ajv';
import type { LoginInput, RegisterInput } from '../../services/auth.service';

/**
 * bcrypt solo usa los primeros 72 bytes de la contraseña e ignora el resto en
 * silencio. Se limita la longitud para que dos contraseñas distintas no
 * terminen generando el mismo hash.
 */
export const PASSWORD_MAX_LENGTH = 72;
/** Longitud mínima de la contraseña al registrarse. */
export const PASSWORD_MIN_LENGTH = 8;

/** Cuerpo de POST /auth/register. */
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

/**
 * Cuerpo de POST /auth/login. No exige longitud mínima: si la regla de
 * contraseñas cambia, los usuarios antiguos deben poder seguir entrando.
 */
export const loginSchema: JSONSchemaType<LoginInput> = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: 1, maxLength: PASSWORD_MAX_LENGTH },
  },
};
