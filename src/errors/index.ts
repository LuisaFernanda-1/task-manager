/**
 * Detalle de un error de validación sobre un campo concreto.
 */
export interface ValidationIssue {
  /** Ruta del campo con el problema, por ejemplo `body.email`. */
  field: string;
  /** Descripción legible del problema. */
  message: string;
}

/**
 * Error base de la aplicación.
 *
 * Todos los errores "esperados" (los que el cliente puede provocar) heredan de
 * esta clase. El middleware de errores los reconoce con `instanceof AppError`
 * y responde con su `statusCode` y `code`. Cualquier otro error se trata como
 * un fallo interno (500) y no expone detalles al cliente.
 */
export abstract class AppError extends Error {
  /** Código HTTP con el que se responde. */
  abstract readonly statusCode: number;
  /** Código estable y legible por máquinas, útil para el frontend. */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — Los datos de la petición no cumplen el esquema esperado. */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message = 'Los datos enviados no son válidos',
    readonly details: ValidationIssue[] = [],
  ) {
    super(message);
  }
}

/** 401 — Falta el token, es inválido, expiró o las credenciales no coinciden. */
export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly code = 'AUTHENTICATION_ERROR';

  constructor(message = 'No autenticado') {
    super(message);
  }
}

/**
 * 404 — El recurso no existe o no pertenece al usuario autenticado.
 *
 * Para tareas ajenas se responde 404 y no 403 a propósito: un 403 confirmaría
 * que esa tarea existe, lo que filtra información sobre otros usuarios.
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Recurso no encontrado') {
    super(message);
  }
}

/** 409 — Conflicto con el estado actual, por ejemplo un email ya registrado. */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';

  constructor(message = 'El recurso ya existe') {
    super(message);
  }
}
