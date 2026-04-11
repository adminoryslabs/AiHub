// Endpoint público: artículos destacados para la homepage
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { ValidationError } from '../../middleware/error-handler';

const router = Router();

const QuerySchema = z.object({
  lang: z.enum(['es', 'en']),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('El parámetro lang es requerido y debe ser "es" o "en"');
    }

    const { lang, limit } = parsed.data;
    const pool = getPool();

    const result = await pool.query(
      `SELECT
        a.id,
        a.slug_uk AS slug,
        ac.slug AS localized_slug,
        ac.title,
        ac.summary,
        a.category,
        ac.last_edited_at
      FROM articles a
      JOIN article_contents ac ON ac.article_id = a.id AND ac.lang = $1
      WHERE a.featured = true AND a.status = 'published'
      ORDER BY ac.last_edited_at DESC
      LIMIT $2`,
      [lang, limit]
    );

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
