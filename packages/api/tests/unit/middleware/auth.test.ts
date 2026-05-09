// Tests unitarios del middleware authenticateUser
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../../../src/middleware/auth';

// Mock de objetos de Express
function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers };
}

function createMockRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('authenticateUser', () => {
  const secret = 'test-jwt-secret-for-testing-only';

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  it('devuelve 401 si no hay header Authorization', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    authenticateUser(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Token requerido' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('devuelve 401 si el header no empieza con Bearer', () => {
    const req = createMockReq({ authorization: 'Basic abc123' });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    authenticateUser(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('devuelve 401 si el token es inválido', () => {
    const req = createMockReq({ authorization: 'Bearer token-invalido' });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    authenticateUser(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Token inválido o expirado' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('devuelve 401 si el token está expirado', () => {
    // Crear token expirado
    const expiredToken = jwt.sign({
      userId: 'uuid-1',
      email: 'admin@test.com',
      role: { id: 'role-1', slug: 'superadmin' },
      permissions: ['article.publish'],
    }, secret, {
      expiresIn: '-1s',
    });

    const req = createMockReq({ authorization: `Bearer ${expiredToken}` });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    authenticateUser(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('llama a next() con token válido y adjunta el usuario al request', () => {
    const validToken = jwt.sign({
      userId: 'uuid-123',
      email: 'admin@test.com',
      role: { id: 'role-1', slug: 'superadmin' },
      permissions: ['article.create', 'article.publish'],
    }, secret, {
      expiresIn: '24h',
    });

    const req = createMockReq({ authorization: `Bearer ${validToken}` });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    authenticateUser(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as Request).adminUser).toEqual({
      id: 'uuid-123',
      email: 'admin@test.com',
      role: { id: 'role-1', slug: 'superadmin' },
      permissions: ['article.create', 'article.publish'],
    });
  });
});
