// Endpoint público: lista de categorías con conteo de artículos
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { ValidationError } from '../../middleware/error-handler';

const router = Router();

const QuerySchema = z.object({
  lang: z.enum(['es', 'en']),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('El parámetro lang es requerido y debe ser "es" o "en"');
    }

    const { lang } = parsed.data;
    const pool = getPool();

    const result = await pool.query(
      `SELECT
        c.slug,
        c.name_es,
        c.name_en,
        c.display_order,
        COUNT(a.id)::int AS article_count
      FROM categories c
      LEFT JOIN articles a ON a.category = c.slug AND a.status = 'published'
      GROUP BY c.slug, c.name_es, c.name_en, c.display_order
      ORDER BY c.display_order`
    );

    const data = result.rows.map((row) => ({
      slug: row.slug,
      name: lang === 'es' ? row.name_es : row.name_en,
      article_count: row.article_count,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
