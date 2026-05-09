// Middleware de autenticación y autorización para rutas privadas del panel
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error-handler';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        role: {
          id: string;
          slug: string;
          name?: string;
        };
        permissions: string[];
      };
      adminUser?: {
        id: string;
        email: string;
        role: {
          id: string;
          slug: string;
          name?: string;
        };
        permissions: string[];
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: {
    id: string;
    slug: string;
    name?: string;
  };
  permissions: string[];
  iat?: number;
  exp?: number;
}

function unauthorized(res: Response, message: string) {
  res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  });
}

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    unauthorized(res, 'Token requerido');
    return;
  }

  const token = header.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no configurado');
    }

    const payload = jwt.verify(token, secret) as JwtPayload;
    const authUser = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
    };

    req.authUser = authUser;
    req.adminUser = authUser;
    next();
  } catch {
    unauthorized(res, 'Token inválido o expirado');
  }
}

export function hasPermission(req: Request, permissionKey: string): boolean {
  return Boolean(req.authUser?.permissions.includes(permissionKey));
}

export function requirePermission(permissionKey: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new AppError('UNAUTHORIZED', 'Sesión no autenticada', 401));
      return;
    }

    if (!hasPermission(req, permissionKey)) {
      next(new AppError('FORBIDDEN', 'No tienes permisos para realizar esta acción', 403));
      return;
    }

    next();
  };
}

export function requireAnyPermission(permissionKeys: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new AppError('UNAUTHORIZED', 'Sesión no autenticada', 401));
      return;
    }

    const allowed = permissionKeys.some((permissionKey) => hasPermission(req, permissionKey));
    if (!allowed) {
      next(new AppError('FORBIDDEN', 'No tienes permisos para acceder a esta sección', 403));
      return;
    }

    next();
  };
}
