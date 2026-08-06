// Endpoints públicos de artículos: lista y detalle
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { ValidationError, NotFoundError } from '../../middleware/error-handler';
import { emitAnalyticsEvent } from '../../services/analytics-emitter';

const router = Router();

// Schema de validación para lista de artículos
const ListQuerySchema = z.object({
  lang: z.enum(['es', 'en']),
  category: z.string().optional(),
  domain: z.string().optional(),
  type: z.enum(['concept', 'tutorial']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

// Schema de validación para detalle de artículo
const DetailQuerySchema = z.object({
  lang: z.enum(['es', 'en']),
});

// GET /api/v1/articles — lista paginada de artículos publicados
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(
        `Parámetros inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { lang, category, domain, type, page, per_page } = parsed.data;
    const pool = getPool();

    // Construir condiciones de filtro dinámicas
    const conditions: string[] = ['a.status = \'published\'', 'ac.lang = $1'];
    const params: unknown[] = [lang];
    let paramIndex = 2;

    if (category) {
      conditions.push(`a.category = $${paramIndex++}`);
      params.push(category);
    }
    if (domain) {
      conditions.push(`$${paramIndex++} = ANY(a.domains)`);
      params.push(domain);
    }
    if (type) {
      conditions.push(`a.type = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * per_page;

    // Query principal
    const query = `
      SELECT
        a.id,
        a.slug_uk AS slug,
        ac.slug AS localized_slug,
        ac.title,
        ac.summary,
        a.type,
        a.category,
        a.domains,
        a.volatility,
        a.featured,
        ac.last_edited_at,
        ac.last_verified_at
      FROM articles a
      JOIN article_contents ac ON ac.article_id = a.id
      WHERE ${whereClause}
      ORDER BY ac.last_edited_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(per_page, offset);

    // Query de conteo total
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

// GET /api/v1/articles/:slug — detalle completo de un artículo publicado
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DetailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('El parámetro lang es requerido y debe ser "es" o "en"');
    }

    const { lang } = parsed.data;
    const { slug } = req.params;
    const pool = getPool();

    // Buscar artículo por slug localizado
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
      WHERE ac.slug = $2 AND a.status = 'published'`,
      [lang, slug]
    );

    if (articleResult.rows.length === 0) {
      throw new NotFoundError('Artículo no encontrado o no está publicado');
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
      // Construir URL según el tipo de artículo
      let altUrl: string;
      if (article.type === 'tutorial') {
        altUrl = `/${alt.lang}/${alt.lang === 'es' ? 'tutoriales' : 'tutorials'}/${alt.slug}`;
      } else {
        altUrl = `/${alt.lang}/${alt.category}/${alt.slug}`;
      }
      alternate_lang = {
        lang: alt.lang,
        slug: alt.slug,
        url: altUrl,
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

    // Fire-and-forget analytics event
    emitAnalyticsEvent({
      event_type: 'article_api',
      slug,
      lang,
      referrer: (req.headers.referer as string) || null,
      device_type: 'desktop',
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

export default router;
