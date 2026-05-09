// Endpoint de autenticación admin: login con JWT
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../../middleware/auth';
import { getUserAuthByEmail, getUserSessionById, buildSessionPayload } from '../../services/access';
import { ValidationError } from '../../middleware/error-handler';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// POST /api/v1/admin/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        `Datos inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { email, password } = parsed.data;

    // Buscar usuario por email
    const user = await getUserAuthByEmail(email);

    if (!user || !user.is_active) {
      // Respuesta genérica para no revelar si el email existe
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        },
      });
      return;
    }

    // Verificar contraseña con bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        },
      });
      return;
    }

    // Generar JWT
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const sessionUser = {
      id: user.id,
      email: user.email,
      role: {
        id: user.role_id,
        slug: user.role_slug,
        name: user.role_name,
      },
      permissions: user.permissions,
    };

    const token = jwt.sign(buildSessionPayload(sessionUser), secret, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    });

    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    res.json({
      data: {
        token,
        expires_at: expiresAt.toISOString(),
        user: sessionUser,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/session', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sesión no autenticada',
        },
      });
      return;
    }

    const sessionUser = await getUserSessionById(userId);
    if (!sessionUser) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sesión no válida',
        },
      });
      return;
    }

    res.json({ data: { user: sessionUser } });
  } catch (err) {
    next(err);
  }
});

export default router;
