// Endpoints públicos de tutoriales: lista y detalle
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { ValidationError, NotFoundError } from '../../middleware/error-handler';

const router = Router();

// Schema de validación para lista de tutoriales
const ListQuerySchema = z.object({
  lang: z.enum(['es', 'en']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

// Schema de validación para detalle de tutorial
const DetailQuerySchema = z.object({
  lang: z.enum(['es', 'en']),
});

// GET /api/v1/tutorials — lista paginada de tutoriales publicados
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(
        `Parámetros inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { lang, difficulty, page, per_page } = parsed.data;
    const pool = getPool();

    // Construir condiciones de filtro
    const conditions: string[] = [
      'a.status = \'published\'',
      'a.type = \'tutorial\'',
      'ac.lang = $1',
    ];
    const params: unknown[] = [lang];
    let paramIndex = 2;

    if (difficulty) {
      conditions.push(`a.difficulty = $${paramIndex++}`);
      params.push(difficulty);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * per_page;

    const query = `
      SELECT
        a.id,
        a.slug_uk AS slug,
        ac.slug AS localized_slug,
        ac.title,
        ac.summary,
        a.difficulty,
        a.estimated_time,
        a.category,
        a.domains,
        ac.last_edited_at,
        ac.last_verified_at
      FROM articles a
      JOIN article_contents ac ON ac.article_id = a.id
      WHERE ${whereClause}
      ORDER BY ac.last_edited_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(per_page, offset);

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM articles a
      JOIN article_contents ac ON ac.article_id = a.id
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, params.length - 2)),
    ]);

    const total = countResult.rows[0].total;
    const total_pages = Math.ceil(total / per_page);

    res.json({
      data: dataResult.rows,
      pagination: { page, per_page, total, total_pages },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tutorials/:slug — detalle de un tutorial publicado
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DetailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('El parámetro lang es requerido y debe ser "es" o "en"');
    }

    const { lang } = parsed.data;
    const { slug } = req.params;
    const pool = getPool();

    // Buscar tutorial por slug localizado (solo type = 'tutorial')
    const articleResult = await pool.query(
      `SELECT
        a.id,
        a.slug_uk AS slug,
        ac.slug AS localized_slug,
        ac.title,
        ac.summary,
        ac.body,
        a.type,
        a.category,
        a.domains,
        a.volatility,
        a.applicable_as_of,
        a.difficulty,
        a.estimated_time,
        ac.last_edited_at,
        ac.last_verified_at
      FROM articles a
      JOIN article_contents ac ON ac.article_id = a.id AND ac.lang = $1
      WHERE ac.slug = $2 AND a.type = 'tutorial' AND a.status = 'published'`,
      [lang, slug]
    );

    if (articleResult.rows.length === 0) {
      throw new NotFoundError('Tutorial no encontrado o no está publicado');
    }

    const article = articleResult.rows[0];

    // Obtener relaciones agrupadas por tipo
    const relationsResult = await pool.query(
      `SELECT
        ar.type,
        a.id,
        a.slug_uk AS slug,
        ac.slug AS localized_slug,
        ac.title,
        a.category
      FROM article_relations ar
      JOIN articles a ON a.id = ar.to_article_id AND a.status = 'published'
      JOIN article_contents ac ON ac.article_id = a.id AND ac.lang = $1
      WHERE ar.from_article_id = $2`,
      [lang, article.id]
    );

    const relations: Record<string, unknown[]> = { related: [], prerequisite: [], next: [] };
    for (const row of relationsResult.rows) {
      const rel = {
        id: row.id,
        slug: row.slug,
        localized_slug: row.localized_slug,
        title: row.title,
        category: row.category,
      };
      if (relations[row.type]) {
        relations[row.type].push(rel);
      }
    }

    // Obtener recursos vinculados
    const resourcesResult = await pool.query(
      `SELECT
        r.id,
        r.title,
        r.type,
        r.url,
        r.description
      FROM resources r
      JOIN article_resources ar ON ar.resource_id = r.id
      WHERE ar.article_id = $1 AND ar.lang = $2
      ORDER BY r.title`,
      [article.id, lang]
    );

    // Obtener enlace al idioma alternativo
    const otherLang = lang === 'es' ? 'en' : 'es';
    const alternateLangResult = await pool.query(
      `SELECT
        ac.lang,
        ac.slug,
        a.category
      FROM article_contents ac
      JOIN articles a ON a.id = ac.article_id
      WHERE ac.article_id = $1 AND ac.lang = $2`,
      [article.id, otherLang]
    );

    let alternate_lang = null;
    if (alternateLangResult.rows.length > 0) {
      const alt = alternateLangResult.rows[0];
      alternate_lang = {
        lang: alt.lang,
        slug: alt.slug,
        url: `/${alt.lang}/${alt.lang === 'es' ? 'tutoriales' : 'tutorials'}/${alt.slug}`,
      };
    }

    res.json({
      data: {
        id: article.id,
        slug: article.slug,
        localized_slug: article.localized_slug,
        title: article.title,
        summary: article.summary,
        body: article.body,
        type: article.type,
        category: article.category,
        domains: article.domains,
        volatility: article.volatility,
        applicable_as_of: article.applicable_as_of,
        difficulty: article.difficulty,
        estimated_time: article.estimated_time,
        last_edited_at: article.last_edited_at,
        last_verified_at: article.last_verified_at,
        relations,
        resources: resourcesResult.rows,
        alternate_lang,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
