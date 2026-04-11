// Endpoint de autenticación admin: login con JWT
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../../services/db';
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
    const pool = getPool();

    // Buscar usuario por email
    const result = await pool.query(
      'SELECT id, email, password_hash FROM admin_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Respuesta genérica para no revelar si el email existe
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        },
      });
      return;
    }

    const user = result.rows[0];

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

    const token = jwt.sign({ userId: user.id, email: user.email }, secret, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    });

    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    res.json({
      data: {
        token,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
