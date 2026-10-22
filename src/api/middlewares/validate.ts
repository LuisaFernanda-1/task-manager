import Ajv, { type ErrorObject, type Schema } from 'ajv';
import addFormats from 'ajv-formats';
import type { RequestHandler } from 'express';
import { ValidationError, type ValidationIssue } from '../../errors';

/**
 * Instancia única de AJV. Compilar un esquema es costoso, por eso se compila
 * una vez al definir la ruta y no en cada petición.
 *
 * - `allErrors`: reporta todos los problemas a la vez, no solo el primero.
 * - `coerceTypes: false`: "123" no se convierte en número a escondidas.
 */
const ajv = new Ajv({ allErrors: true, coerceTypes: false, strict: true });
addFormats(ajv, ['email', 'date', 'date-time', 'uuid']);

type RequestPart = 'body' | 'params' | 'query';

/** Esquemas a validar por cada parte de la petición. */
export type RequestSchemas = Partial<Record<RequestPart, Schema>>;

/**
 * Crea un middleware que valida body, params y/o query contra JSON Schemas.
 * Si algo no cumple, lanza {@link ValidationError} con todos los problemas.
 *
 * @example
 * router.post('/', validate({ body: taskBodySchema }), controller.create);
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  const validators = (Object.entries(schemas) as [RequestPart, Schema][]).map(
    ([part, schema]) => [part, ajv.compile(schema)] as const,
  );

  return (req, _res, next) => {
    const issues: ValidationIssue[] = [];

    for (const [part, validator] of validators) {
      // Si no llega cuerpo, Express deja `req.body` en undefined: se valida como objeto vacío
      // para que el error sea "falta el campo X" y no "debe ser un objeto".
      const data = part === 'body' ? (req.body ?? {}) : req[part];
      if (!validator(data)) {
        issues.push(...(validator.errors ?? []).map((error) => toIssue(part, error)));
      }
    }

    if (issues.length > 0) {
      next(new ValidationError('Los datos enviados no son válidos', issues));
      return;
    }
    next();
  };
}

/** Traduce un error de AJV a un mensaje en español con la ruta del campo. */
function toIssue(part: RequestPart, error: ErrorObject): ValidationIssue {
  const path = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
  const params = error.params as Record<string, unknown>;

  switch (error.keyword) {
    case 'required':
      return { field: join(part, path, String(params.missingProperty)), message: 'Es obligatorio' };
    case 'additionalProperties':
      return { field: join(part, path, String(params.additionalProperty)), message: 'Campo no permitido' };
    case 'format':
      return { field: join(part, path), message: formatMessage(String(params.format)) };
    case 'minLength':
      return { field: join(part, path), message: `Debe tener al menos ${String(params.limit)} caracteres` };
    case 'maxLength':
      return { field: join(part, path), message: `Debe tener como máximo ${String(params.limit)} caracteres` };
    case 'enum':
      return {
        field: join(part, path),
        message: `Debe ser uno de: ${(params.allowedValues as unknown[]).join(', ')}`,
      };
    case 'type':
      return { field: join(part, path), message: `Debe ser de tipo ${String(params.type)}` };
    case 'minProperties':
      return { field: part, message: 'Debe enviar al menos un campo' };
    case 'pattern':
      return { field: join(part, path), message: 'No puede estar vacío' };
    default:
      return { field: join(part, path), message: error.message ?? 'Valor inválido' };
  }
}

function formatMessage(format: string): string {
  const messages: Record<string, string> = {
    email: 'Debe ser un email válido',
    date: 'Debe ser una fecha válida con formato YYYY-MM-DD',
    'date-time':
      'Debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-10-23T16:00:00-05:00',
    uuid: 'Debe ser un UUID válido',
  };
  return messages[format] ?? `Debe tener formato ${format}`;
}

function join(...segments: string[]): string {
  return segments.filter(Boolean).join('.');
}
