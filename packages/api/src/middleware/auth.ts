// Middleware de autenticación JWT para rutas de admin
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        email: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Verificar el token JWT en el header Authorization
export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token requerido',
      },
    });
    return;
  }

  const token = header.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no configurado');
    }

    const payload = jwt.verify(token, secret) as JwtPayload;
    req.adminUser = {
      id: payload.userId,
      email: payload.email,
    };
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token inválido o expirado',
      },
    });
  }
}
