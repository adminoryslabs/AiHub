// Endpoints admin de artículos: CRUD completo con estados y contenido
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { upsertDocument, updateDocumentStatus, deleteArticleDocuments } from '../../services/meilisearch';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AppError,
} from '../../middleware/error-handler';

const router = Router();

// Schemas de validación
const ListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'deprecated']).optional(),
  category: z.string().optional(),
  type: z.enum(['concept', 'tool-branch']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateArticleSchema = z.object({
  slug_uk: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  type: z.enum(['concept', 'tool-branch']),
  parent_id: z.string().uuid().nullable().optional(),
  category: z.string().min(1),
  domains: z.array(z.string()).default(['programming']),
  volatility: z.enum(['low', 'medium', 'high']).default('low'),
  featured: z.boolean().default(false),
});

const UpdateArticleSchema = z.object({
  category: z.string().optional(),
  volatility: z.enum(['low', 'medium', 'high']).optional(),
  featured: z.boolean().optional(),
  domains: z.array(z.string()).optional(),
  applicable_as_of: z.string().nullable().optional(),
});

const ContentSchema = z.object({
  lang: z.enum(['es', 'en']),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  title: z.string().min(1).max(500),
  summary: z.string().min(1),
  body: z.string().default(''),
});

const StatusSchema = z.object({
  status: z.enum(['draft', 'published', 'deprecated']),
});

const VerifySchema = z.object({
  lang: z.enum(['es', 'en']),
});

const RelationSchema = z.object({
  to_article_id: z.string().uuid(),
  type: z.enum(['related', 'prerequisite', 'next']),
});

const ResourceLinkSchema = z.object({
  resource_id: z.string().uuid(),
  lang: z.enum(['es', 'en']),
});

// Transiciones de estado válidas
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['published'],
  published: ['deprecated'],
  deprecated: ['draft'],
};

function createLocalizedResources() {
  return { es: [], en: [] } as {
    es: Array<Record<string, unknown>>;
    en: Array<Record<string, unknown>>;
  };
}

// GET /api/v1/admin/articles — lista de todos los artículos con estado de contenido
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Parámetros de filtro inválidos');
    }

    const { status, category, type, search, page, per_page } = parsed.data;
    const pool = getPool();

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`a.status = $${paramIndex++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`a.category = $${paramIndex++}`);
      params.push(category);
    }
    if (type) {
      conditions.push(`a.type = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * per_page;

    // Obtener artículos con contenido agrupado
    const articlesResult = await pool.query(
      `SELECT
        a.id,
        a.slug_uk,
        a.type,
        a.category,
        a.status,
        a.featured,
        a.volatility,
        a.domains,
        a.created_at,
        a.updated_at,
        (
          SELECT COUNT(*)::int
          FROM articles child
          WHERE child.parent_id = a.id
        ) AS children_count
      FROM articles a
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, per_page, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM articles a ${whereClause}`,
      params
    );

    const total = countResult.rows[0].total;

    // Obtener contenido de cada artículo
    const articleIds = articlesResult.rows.map((r) => r.id);
    let contentsMap: Map<string, Record<string, unknown>[]> = new Map();

    if (articleIds.length > 0) {
      const contentsResult = await pool.query(
        `SELECT
          article_id,
          lang,
          title,
          (body != '') AS has_body,
          last_edited_at,
          last_verified_at
        FROM article_contents
        WHERE article_id = ANY($1)`,
        [articleIds]
      );

      for (const row of contentsResult.rows) {
        if (!contentsMap.has(row.article_id)) {
          contentsMap.set(row.article_id, []);
        }
        contentsMap.get(row.article_id)!.push(row);
      }
    }

    // Filtrar por búsqueda de texto en título (post-query)
    let filteredData = articlesResult.rows.map((article) => {
      const contents = contentsMap.get(article.id) || [];
      const content_status: Record<string, unknown> = {};
      for (const c of contents) {
        content_status[c.lang as string] = {
          title: c.title,
          has_body: c.has_body,
          last_edited_at: c.last_edited_at,
          last_verified_at: c.last_verified_at,
        };
      }
      return { ...article, content_status };
    });

    // Filtrar por búsqueda de texto
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter((a) => {
        const esTitleLower = (
          (a.content_status as Record<string, { title: string }>).es?.title || ''
        ).toLowerCase();
        const enTitleLower = (
          (a.content_status as Record<string, { title: string }>).en?.title || ''
        ).toLowerCase();
        return (
          a.slug_uk.toLowerCase().includes(searchLower) ||
          esTitleLower.includes(searchLower) ||
          enTitleLower.includes(searchLower)
        );
      });
    }

    res.json({
      data: filteredData,
      pagination: {
        page,
        per_page,
        total: search ? filteredData.length : total,
        total_pages: Math.ceil((search ? filteredData.length : total) / per_page),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/articles — crear artículo con metadatos
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateArticleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        `Datos inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { slug_uk, type, parent_id, category, domains, volatility, featured } = parsed.data;
    const pool = getPool();

    // Validar que category existe
    const catResult = await pool.query('SELECT slug FROM categories WHERE slug = $1', [category]);
    if (catResult.rows.length === 0) {
      throw new ValidationError(`Categoría '${category}' no existe`);
    }

    // Validar reglas de tipo
    if (type === 'tool-branch' && !parent_id) {
      throw new ValidationError('parent_id es requerido para artículos de tipo tool-branch');
    }
    if (type === 'concept' && parent_id) {
      throw new ValidationError('Los artículos de tipo concept no pueden tener parent_id');
    }
    if (parent_id) {
      const parentResult = await pool.query('SELECT id FROM articles WHERE id = $1', [parent_id]);
      if (parentResult.rows.length === 0) {
        throw new ValidationError('El artículo padre no existe');
      }
    }

    // Verificar que slug_uk es único
    const slugResult = await pool.query('SELECT id FROM articles WHERE slug_uk = $1', [slug_uk]);
    if (slugResult.rows.length > 0) {
      throw new ConflictError(`Ya existe un artículo con slug_uk '${slug_uk}'`);
    }

    const result = await pool.query(
      `INSERT INTO articles (slug_uk, type, parent_id, category, domains, volatility, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, slug_uk, type, category, status, created_at`,
      [slug_uk, type, parent_id || null, category, domains, volatility, featured]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/articles/:id — detalle completo para edición
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const articleResult = await pool.query(
      `SELECT id, slug_uk, type, parent_id, category, domains, status, featured, volatility,
              applicable_as_of, created_at, updated_at
       FROM articles WHERE id = $1`,
      [id]
    );

    if (articleResult.rows.length === 0) {
      throw new NotFoundError('Artículo no encontrado');
    }

    const article = articleResult.rows[0];

    // Obtener contenidos
    const contentsResult = await pool.query(
      `SELECT lang, slug, title, summary, body, last_edited_at, last_verified_at
       FROM article_contents WHERE article_id = $1 ORDER BY lang`,
      [id]
    );

    // Obtener relaciones agrupadas
    const relationsResult = await pool.query(
      `SELECT to_article_id, type FROM article_relations WHERE from_article_id = $1`,
      [id]
    );

    const relations: Record<string, string[]> = { related: [], prerequisite: [], next: [] };
    for (const row of relationsResult.rows) {
      if (relations[row.type]) {
        relations[row.type].push(row.to_article_id);
      }
    }

    // Obtener recursos
    const resourcesResult = await pool.query(
      `SELECT r.id, r.title, r.type, r.url, r.description, ar.lang
       FROM resources r
       JOIN article_resources ar ON ar.resource_id = r.id
       WHERE ar.article_id = $1
       ORDER BY ar.lang, r.title`,
      [id]
    );

    const resources = createLocalizedResources();
    for (const row of resourcesResult.rows) {
      const { lang, ...resource } = row as { lang: 'es' | 'en' } & Record<string, unknown>;
      if (lang === 'es' || lang === 'en') {
        resources[lang].push(resource);
      }
    }

    // Obtener artículos hijos
    const childrenResult = await pool.query(
      `SELECT
        a.id,
        a.slug_uk,
        a.status,
        MAX(CASE WHEN ac.lang = 'es' THEN ac.title END) AS title_es,
        MAX(CASE WHEN ac.lang = 'en' THEN ac.title END) AS title_en
      FROM articles a
      LEFT JOIN article_contents ac ON ac.article_id = a.id
      WHERE a.parent_id = $1
      GROUP BY a.id, a.slug_uk, a.status`,
      [id]
    );

    res.json({
      data: {
        ...article,
        contents: contentsResult.rows,
        relations,
        resources,
        children: childrenResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/admin/articles/:id — actualizar metadatos
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = UpdateArticleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos de actualización inválidos');
    }

    const updates = parsed.data;
    const pool = getPool();

    // Verificar que el artículo existe
    const existingResult = await pool.query('SELECT id FROM articles WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      throw new NotFoundError('Artículo no encontrado');
    }

    // Construir SET dinámico
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.category !== undefined) {
      const catResult = await pool.query('SELECT slug FROM categories WHERE slug = $1', [
        updates.category,
      ]);
      if (catResult.rows.length === 0) {
        throw new ValidationError(`Categoría '${updates.category}' no existe`);
      }
      setClauses.push(`category = $${paramIndex++}`);
      params.push(updates.category);
    }
    if (updates.volatility !== undefined) {
      setClauses.push(`volatility = $${paramIndex++}`);
      params.push(updates.volatility);
    }
    if (updates.featured !== undefined) {
      setClauses.push(`featured = $${paramIndex++}`);
      params.push(updates.featured);
    }
    if (updates.domains !== undefined) {
      setClauses.push(`domains = $${paramIndex++}`);
      params.push(updates.domains);
    }
    if (updates.applicable_as_of !== undefined) {
      setClauses.push(`applicable_as_of = $${paramIndex++}`);
      params.push(updates.applicable_as_of);
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No se proporcionaron campos para actualizar');
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE articles SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/articles/:id/content — importar/actualizar contenido de un idioma
router.post('/:id/content', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const parsed = ContentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        `Datos inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { lang, slug, title, summary, body } = parsed.data;
    const pool = getPool();

    // Verificar que el artículo existe
    const articleResult = await pool.query(
      'SELECT id, category, type, status, domains FROM articles WHERE id = $1',
      [id]
    );
    if (articleResult.rows.length === 0) {
      throw new NotFoundError('Artículo no encontrado');
    }

    const article = articleResult.rows[0];

    // Upsert del contenido
    const result = await pool.query(
      `INSERT INTO article_contents (article_id, lang, slug, title, summary, body, last_edited_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (article_id, lang) DO UPDATE SET
         slug = EXCLUDED.slug,
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         body = EXCLUDED.body,
         last_edited_at = now()
       RETURNING article_id, lang, slug, title, last_edited_at`,
      [id, lang, slug, title, summary, body]
    );

    // Sincronizar con Meilisearch
    await upsertDocument({
      document_id: `${id}--${lang}`,
      article_id: id,
      lang,
      slug,
      title,
      summary,
      body,
      category: article.category,
      type: article.type,
      status: article.status,
      domains: article.domains,
      last_edited_at: result.rows[0].last_edited_at,
    }).catch(() => {
      // No fallar si Meilisearch no está disponible
    });

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/admin/articles/:id/status — cambiar estado del artículo
router.put('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Estado inválido. Debe ser: draft, published o deprecated');
    }

    const { status: newStatus } = parsed.data;
    const pool = getPool();

    const articleResult = await pool.query(
      'SELECT id, status FROM articles WHERE id = $1',
      [id]
    );
    if (articleResult.rows.length === 0) {
      throw new NotFoundError('Artículo no encontrado');
    }

    const currentStatus = articleResult.rows[0].status;

    // Validar transición
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        'CONFLICT',
        `Transición inválida: ${currentStatus} → ${newStatus}. Transiciones permitidas: ${VALID_TRANSITIONS[currentStatus]?.join(', ') || 'ninguna'}`,
        409
      );
    }

    const result = await pool.query(
      'UPDATE articles SET status = $1 WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    // Sincronizar estado en Meilisearch
    await updateDocumentStatus(id, newStatus).catch(() => {
      // No fallar si Meilisearch no está disponible
    });

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/articles/:id/verify — marcar como verificado en un idioma
router.post('/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('El lang debe ser "es" o "en"');
    }

    const { lang } = parsed.data;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE article_contents SET last_verified_at = now()
       WHERE article_id = $1 AND lang = $2
       RETURNING article_id, lang, last_verified_at`,
      [id, lang]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(`No existe contenido en ${lang} para este artículo`);
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/articles/:id/relations — agregar relación entre artículos
router.post('/:id/relations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = RelationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos de relación inválidos');
    }

    const { to_article_id, type } = parsed.data;
    const pool = getPool();

    // Verificar que el artículo destino existe
    const destResult = await pool.query('SELECT id FROM articles WHERE id = $1', [to_article_id]);
    if (destResult.rows.length === 0) {
      throw new NotFoundError('El artículo destino no existe');
    }

    if (id === to_article_id) {
      throw new ValidationError('Un artículo no puede relacionarse consigo mismo');
    }

    const result = await pool.query(
      `INSERT INTO article_relations (from_article_id, to_article_id, type)
       VALUES ($1, $2, $3)
       ON CONFLICT ON CONSTRAINT uq_article_relation DO NOTHING
       RETURNING from_article_id, to_article_id, type`,
      [id, to_article_id, type]
    );

    if (result.rows.length === 0) {
      throw new ConflictError('La relación ya existe');
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/articles/:id/relations/:to_id — eliminar relación
router.delete('/:id/relations/:to_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, to_id } = req.params;
    const typeQuery = z.object({ type: z.enum(['related', 'prerequisite', 'next']) });
    const parsed = typeQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('El parámetro type es requerido');
    }

    const { type } = parsed.data;
    const pool = getPool();

    const result = await pool.query(
      `DELETE FROM article_relations
       WHERE from_article_id = $1 AND to_article_id = $2 AND type = $3
       RETURNING from_article_id`,
      [id, to_id, type]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Relación no encontrada');
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/articles/:id/resources — vincular recurso a artículo
router.post('/:id/resources', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = ResourceLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('resource_id es requerido y debe ser un UUID válido');
    }

    const { resource_id, lang } = parsed.data;
    const pool = getPool();

    // Verificar que el recurso existe
    const resResult = await pool.query('SELECT id FROM resources WHERE id = $1', [resource_id]);
    if (resResult.rows.length === 0) {
      throw new NotFoundError('Recurso no encontrado');
    }

    await pool.query(
      `INSERT INTO article_resources (article_id, resource_id, lang) VALUES ($1, $2, $3)
       ON CONFLICT ON CONSTRAINT uq_article_resource_lang DO NOTHING`,
      [id, resource_id, lang]
    );

    res.status(201).json({
      data: { article_id: id, resource_id, lang },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/articles/:id/resources/:resource_id — desvincular recurso
router.delete(
  '/:id/resources/:resource_id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, resource_id } = req.params;
      const langQuery = z.object({ lang: z.enum(['es', 'en']) });
      const parsed = langQuery.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('El parámetro lang es requerido');
      }

      const { lang } = parsed.data;
      const pool = getPool();

      const result = await pool.query(
        `DELETE FROM article_resources WHERE article_id = $1 AND resource_id = $2 AND lang = $3
         RETURNING article_id`,
        [id, resource_id, lang]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Vínculo no encontrado');
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export { deleteArticleDocuments };
export default router;
