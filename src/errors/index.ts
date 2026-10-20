export interface ValidationIssue {
  field: string;
  message: string;
}

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

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

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly code = 'AUTHENTICATION_ERROR';

  constructor(message = 'No autenticado') {
    super(message);
  }
}

// 404 en vez de 403 para no revelar que la tarea existe
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Recurso no encontrado') {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';

  constructor(message = 'El recurso ya existe') {
    super(message);
  }
}
