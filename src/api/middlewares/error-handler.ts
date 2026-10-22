import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError, ValidationError } from '../../errors';

/** Forma única de todas las respuestas de error de la API. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

/** Responde 404 a cualquier ruta que no exista. Se registra después de todas las rutas. */
export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError(`No existe la ruta ${req.method} ${req.path}`);
};

/** Errores que lanza `express.json()` cuando el cuerpo no se puede leer. */
interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

/**
 * Manejador de errores centralizado. Es el único lugar que convierte errores en respuestas HTTP.
 *
 * - {@link AppError}: se responde con su código y mensaje.
 * - Errores de lectura del cuerpo (JSON mal formado, demasiado grande): 400 / 413.
 * - Cualquier otra cosa es un error no previsto: se registra en el log y el
 *   cliente recibe un 500 genérico, sin stack trace ni detalles internos.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: ErrorResponse = { error: { code: err.code, message: err.message } };
    if (err instanceof ValidationError && err.details.length > 0) {
      body.error.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  const parserError = err as BodyParserError;
  if (parserError.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es un JSON válido' } });
    return;
  }
  if (parserError.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la petición es demasiado grande' } });
    return;
  }

  console.error('[error no controlado]', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno en el servidor' } });
};
