// Endpoint público: sitemap XML para SEO
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';

const router = Router();

const QuerySchema = z.object({
  lang: z.enum(['es', 'en']).optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    const { lang } = parsed.success ? parsed.data : { lang: undefined };

    const pool = getPool();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihub.example.com';

    // Obtener todos los artículos publicados con su contenido en ambos idiomas
    let query: string;
    let params: unknown[];

    if (lang) {
      query = `
        SELECT
          a.id,
          a.category,
          ac.lang,
          ac.slug,
          ac.last_edited_at
        FROM articles a
        JOIN article_contents ac ON ac.article_id = a.id AND ac.lang = $1
        WHERE a.status = 'published'
        ORDER BY ac.last_edited_at DESC
      `;
      params = [lang];
    } else {
      query = `
        SELECT
          a.id,
          a.category,
          ac.lang,
          ac.slug,
          ac.last_edited_at
        FROM articles a
        JOIN article_contents ac ON ac.article_id = a.id
        WHERE a.status = 'published'
        ORDER BY a.id, ac.lang
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    // Agrupar por artículo para construir hreflang
    const articleMap = new Map<string, { es?: typeof result.rows[0]; en?: typeof result.rows[0] }>();

    for (const row of result.rows) {
      if (!articleMap.has(row.id)) {
        articleMap.set(row.id, {});
      }
      const entry = articleMap.get(row.id)!;
      entry[row.lang as 'es' | 'en'] = row;
    }

    // Construir el XML del sitemap
    const urls: string[] = [];

    for (const [, langs] of articleMap) {
      const esRow = langs.es;
      const enRow = langs.en;

      const generateUrl = (row: typeof result.rows[0]) => {
        const loc = `${siteUrl}/${row.lang}/${row.category}/${row.slug}`;
        const lastmod = new Date(row.last_edited_at).toISOString();

        const alternates: string[] = [];
        if (esRow) {
          alternates.push(
            `    <xhtml:link rel="alternate" hreflang="es" href="${siteUrl}/es/${esRow.category}/${esRow.slug}"/>`
          );
        }
        if (enRow) {
          alternates.push(
            `    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/${enRow.category}/${enRow.slug}"/>`
          );
        }

        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
${alternates.join('\n')}
  </url>`;
      };

      if (esRow) urls.push(generateUrl(esRow));
      if (enRow && !esRow) urls.push(generateUrl(enRow));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
