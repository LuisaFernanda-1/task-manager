import Ajv, { type ErrorObject, type Schema } from 'ajv';
import addFormats from 'ajv-formats';
import type { RequestHandler } from 'express';
import { ValidationError, type ValidationIssue } from '../../errors';

const ajv = new Ajv({ allErrors: true, coerceTypes: false, strict: true });
addFormats(ajv, ['email', 'date', 'uuid']);

type RequestPart = 'body' | 'params' | 'query';

export type RequestSchemas = Partial<Record<RequestPart, Schema>>;

export function validate(schemas: RequestSchemas): RequestHandler {
  const validators = (Object.entries(schemas) as [RequestPart, Schema][]).map(
    ([part, schema]) => [part, ajv.compile(schema)] as const,
  );

  return (req, _res, next) => {
    const issues: ValidationIssue[] = [];

    for (const [part, validator] of validators) {
      // sin body, express deja req.body en undefined
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
    uuid: 'Debe ser un UUID válido',
  };
  return messages[format] ?? `Debe tener formato ${format}`;
}

function join(...segments: string[]): string {
  return segments.filter(Boolean).join('.');
}
