// Middleware centralizado de manejo de errores
import { Request, Response, NextFunction } from 'express';

// Error personalizado con código y status HTTP
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Errores de validación de Zod
export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

// Error de recurso no encontrado
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

// Error de conflicto (ej: slug duplicado)
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

// Handler global de errores
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Error de PostgreSQL: violación de unicidad
  if ((err as { code?: string }).code === '23505') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Ya existe un registro con esos datos',
      },
    });
    return;
  }

  // Error de PostgreSQL: violación de FK
  if ((err as { code?: string }).code === '23503') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Referencia a un recurso que no existe',
      },
    });
    return;
  }

  // Error desconocido: log y respuesta genérica
  process.stderr.write(`Error no manejado: ${err.message}\n${err.stack}\n`);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    },
  });
}
