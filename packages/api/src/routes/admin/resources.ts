// Endpoints admin de recursos externos: CRUD completo
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { ValidationError, NotFoundError } from '../../middleware/error-handler';

const router = Router();

const CreateResourceSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(['doc', 'video', 'course', 'article']),
  url: z.string().url('URL inválida').max(2000),
  description: z.string().nullable().optional(),
});

const UpdateResourceSchema = CreateResourceSchema.partial();

// POST /api/v1/admin/resources — crear recurso
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        `Datos inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { title, type, url, description } = parsed.data;
    const pool = getPool();

    const result = await pool.query(
      `INSERT INTO resources (title, type, url, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, type, url, description || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/resources — listar todos los recursos
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM resources ORDER BY created_at DESC'
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/admin/resources/:id — actualizar recurso
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = UpdateResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos de actualización inválidos');
    }

    const updates = parsed.data;
    const pool = getPool();

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      params.push(updates.type);
    }
    if (updates.url !== undefined) {
      setClauses.push(`url = $${paramIndex++}`);
      params.push(updates.url);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No se proporcionaron campos para actualizar');
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE resources SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Recurso no encontrado');
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/resources/:id — eliminar recurso (y sus vínculos)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM resources WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Recurso no encontrado');
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
