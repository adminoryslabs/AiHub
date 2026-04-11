// Tests unitarios del error handler centralizado
import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../../../src/middleware/error-handler';

function createMockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

describe('errorHandler', () => {
  const req = {} as Request;
  const next = vi.fn() as unknown as NextFunction;

  it('maneja AppError con código y status correcto', () => {
    const err = new AppError('FORBIDDEN', 'Acceso denegado', 403);
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
    });
  });

  it('maneja ValidationError con status 400', () => {
    const err = new ValidationError('Campo requerido');
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Campo requerido' },
    });
  });

  it('maneja NotFoundError con status 404', () => {
    const err = new NotFoundError('Artículo no encontrado');
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Artículo no encontrado' },
    });
  });

  it('maneja ConflictError con status 409', () => {
    const err = new ConflictError('Slug duplicado');
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: 'Slug duplicado' },
    });
  });

  it('maneja error de PostgreSQL de unicidad (23505) con 409', () => {
    const err = Object.assign(new Error('duplicate key'), { code: '23505' });
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: 'Ya existe un registro con esos datos' },
    });
  });

  it('maneja error de PostgreSQL de FK (23503) con 400', () => {
    const err = Object.assign(new Error('foreign key violation'), { code: '23503' });
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('devuelve 500 para errores desconocidos', () => {
    const err = new Error('Error inesperado');
    const res = createMockRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    });
  });
});
