// Endpoint público: búsqueda full-text mediante Meilisearch
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { searchArticles } from '../../services/meilisearch';
import { ValidationError } from '../../middleware/error-handler';

const router = Router();

const QuerySchema = z.object({
  q: z.string().min(1, 'El término de búsqueda no puede estar vacío'),
  lang: z.enum(['es', 'en']).optional(),
  category: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(
        `Parámetros inválidos: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const { q, lang, category } = parsed.data;

    const searchResult = await searchArticles(q, { lang, category });

    // Mapear resultados de Meilisearch al formato de respuesta
    const results = searchResult.hits.map((hit) => {
      const formatted = hit as unknown as Record<string, unknown>;
      const highlightResult = formatted._formatted as Record<string, unknown> | undefined;

      return {
        article_id: hit.article_id,
        lang: hit.lang,
        slug: hit.slug,
        title: hit.title,
        summary: hit.summary,
        category: hit.category,
        type: hit.type,
        highlight: {
          title: (highlightResult?.title as string) || hit.title,
          summary: (highlightResult?.summary as string) || hit.summary,
        },
      };
    });

    res.json({
      data: {
        query: q,
        results,
        total: searchResult.estimatedTotalHits,
        processing_time_ms: searchResult.processingTimeMs,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
