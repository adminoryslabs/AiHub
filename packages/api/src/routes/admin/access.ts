import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { NotFoundError, ValidationError } from '../../middleware/error-handler';
import { requirePermission } from '../../middleware/auth';

const router = Router();

const UpdateUserRoleSchema = z.object({
  role_id: z.string().uuid(),
});

const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.string()).default([]),
});

router.use(requirePermission('access.manage'));

router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.is_active,
        u.created_at,
        r.id AS role_id,
        r.slug AS role_slug,
        r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at ASC`
    );

    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        is_active: row.is_active,
        created_at: row.created_at,
        role: {
          id: row.role_id,
          slug: row.role_slug,
          name: row.role_name,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = UpdateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('role_id debe ser un UUID válido');
    }

    const pool = getPool();
    const roleResult = await pool.query('SELECT id, slug, name FROM roles WHERE id = $1', [parsed.data.role_id]);
    if (roleResult.rows.length === 0) {
      throw new NotFoundError('Rol no encontrado');
    }

    const result = await pool.query(
      `UPDATE users
       SET role_id = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, email, is_active, created_at`,
      [parsed.data.role_id, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    res.json({
      data: {
        ...result.rows[0],
        role: {
          id: roleResult.rows[0].id,
          slug: roleResult.rows[0].slug,
          name: roleResult.rows[0].name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/roles', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
        r.id,
        r.slug,
        r.name,
        r.is_system,
        COALESCE(array_agg(p.key ORDER BY p.key) FILTER (WHERE p.key IS NOT NULL), '{}') AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id, r.slug, r.name, r.is_system
      ORDER BY r.created_at ASC`
    );

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.put('/roles/:id/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = UpdateRolePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('permissions debe ser un array');
    }

    const pool = getPool();
    const roleResult = await pool.query('SELECT id, slug, name, is_system FROM roles WHERE id = $1', [id]);
    if (roleResult.rows.length === 0) {
      throw new NotFoundError('Rol no encontrado');
    }

    const permissionsResult = await pool.query(
      'SELECT id, key FROM permissions WHERE key = ANY($1)',
      [parsed.data.permissions]
    );

    const foundKeys = new Set(permissionsResult.rows.map((row) => row.key));
    const missingKeys = parsed.data.permissions.filter((key) => !foundKeys.has(key));
    if (missingKeys.length > 0) {
      throw new ValidationError(`Permisos desconocidos: ${missingKeys.join(', ')}`);
    }

    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    for (const permission of permissionsResult.rows) {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
        [id, permission.id]
      );
    }

    res.json({
      data: {
        id: roleResult.rows[0].id,
        slug: roleResult.rows[0].slug,
        name: roleResult.rows[0].name,
        is_system: roleResult.rows[0].is_system,
        permissions: [...parsed.data.permissions].sort(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
