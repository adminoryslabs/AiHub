// Endpoint público: colección de eventos de analytics
import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsEventSchema } from '../../types/analytics';
import { getPool } from '../../services/db';
import { hashIp, IpHashRequest } from '../../middleware/ip-hash';
import { rateLimit } from '../../middleware/rate-limit';

const router = Router();

// Apply IP hashing + rate limiting to all routes in this router
router.use(hashIp);
router.use(rateLimit);

router.post('/', async (req: IpHashRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = AnalyticsEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Payload inválido: ${parsed.error.errors.map((e) => e.message).join(', ')}`,
        },
      });
      return;
    }

    const event = parsed.data;
    const pool = getPool();

    await pool.query(
      `INSERT INTO analytics_events
        (event_type, slug, lang, referrer_domain, device_type, ip_hash, query, results_count, extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        event.event_type,
        event.slug,
        event.lang,
        event.referrer,
        event.device_type,
        req.ipHash!,
        event.query || null,
        event.results_count ?? null,
        event.extra ? JSON.stringify(event.extra) : null,
      ]
    );

    res.status(202).json({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
});

export default router;
