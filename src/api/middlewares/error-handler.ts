import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError, ValidationError } from '../../errors';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError(`No existe la ruta ${req.method} ${req.path}`);
};

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

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
