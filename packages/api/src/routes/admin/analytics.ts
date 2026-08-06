// Rutas admin de analytics: summary + config
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../../services/db';
import { requireAnyPermission } from '../../middleware/auth';
import { aggregateHourly, aggregateDaily, aggregateCurrentHour } from '../../services/aggregation';
import { SERVER_SIDE_IP_HASH } from '../../services/analytics-emitter';

const router = Router();

// Auth + permission check for all routes
router.use(requireAnyPermission(['article.review', 'article.publish']));

// Schema for config update
const ConfigUpdateSchema = z.object({
  retention_days: z.number().int().min(1),
});

// GET /api/v1/analytics/admin/summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const days = parseInt(req.query.days as string) || 30;
    const lang = req.query.lang as string | undefined;
    const deviceType = req.query.device_type as string | undefined;
    const referrerDomain = req.query.referrer_domain as string | undefined;

    // Build filter conditions
    const conditions: string[] = [`day >= NOW() - INTERVAL '${days} days'`];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (lang) {
      conditions.push(`lang = $${paramIdx++}`);
      params.push(lang);
    }
    if (deviceType) {
      conditions.push(`device_type = $${paramIdx++}`);
      params.push(deviceType);
    }
    if (referrerDomain) {
      conditions.push(`referrer_domain = $${paramIdx++}`);
      params.push(referrerDomain);
    }

    const whereClause = conditions.join(' AND ');

    // Total views
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(count), 0)::int as total_views
       FROM analytics_rollups_daily
       WHERE event_type = 'page_view' AND ${whereClause}`,
      params
    );

    // Unique visitors (from raw events).
    // Excluye el centinela 'server-side': esos eventos los emite la propia API
    // durante el SSR, no son personas, y si se cuentan el total nunca baja de 1.
    const uniqueResult = await pool.query(
      `SELECT COUNT(DISTINCT ip_hash)::int as unique_visitors
       FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '${days} days'
         AND ip_hash <> $4
         AND ($1::text IS NULL OR lang = $1)
         AND ($2::text IS NULL OR device_type = $2)
         AND ($3::text IS NULL OR referrer_domain = $3)`,
      [lang || null, deviceType || null, referrerDomain || null, SERVER_SIDE_IP_HASH]
    );

    // Top articles
    const topResult = await pool.query(
      `SELECT slug, SUM(count)::int as views
       FROM analytics_rollups_daily
       WHERE event_type = 'page_view' AND slug != '' AND ${whereClause}
       GROUP BY slug
       ORDER BY views DESC
       LIMIT 10`,
      params
    );

    // Daily trend
    const trendResult = await pool.query(
      `SELECT day::date as day, SUM(count)::int as views
       FROM analytics_rollups_daily
       WHERE event_type = 'page_view' AND ${whereClause}
       GROUP BY day
       ORDER BY day`,
      params
    );

    // By language
    const langResult = await pool.query(
      `SELECT lang, SUM(count)::int as views
       FROM analytics_rollups_daily
       WHERE event_type = 'page_view' AND ${whereClause}
       GROUP BY lang`,
      params
    );

    const byLang: Record<string, number> = { es: 0, en: 0 };
    for (const row of langResult.rows) {
      byLang[row.lang] = row.views;
    }

    res.json({
      data: {
        total_views: totalResult.rows[0].total_views,
        unique_visitors: uniqueResult.rows[0].unique_visitors,
        top_articles: topResult.rows,
        daily_trend: trendResult.rows,
        by_lang: byLang,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/admin/config
router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT value FROM analytics_config WHERE key = 'retention_days'`
    );

    res.json({
      data: {
        retention_days: parseInt(result.rows[0]?.value || '90', 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/analytics/admin/config
router.put('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ConfigUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Payload inválido: ${parsed.error.errors.map((e) => e.message).join(', ')}`,
        },
      });
      return;
    }

    const pool = getPool();
    await pool.query(
      `UPDATE analytics_config SET value = $1 WHERE key = 'retention_days'`,
      [String(parsed.data.retention_days)]
    );

    res.json({
      data: {
        retention_days: parsed.data.retention_days,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/analytics/admin/aggregate
// On-demand aggregation: re-runs the previous-hour rollup, the previous-day
// rollup, AND aggregates the current (partial) hour so the dashboard shows
// real-time data without waiting for the cron at :05.
router.post('/aggregate', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const start = Date.now();
    await aggregateHourly();
    await aggregateDaily();
    await aggregateCurrentHour();
    res.json({
      data: {
        status: 'ok',
        duration_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
