import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../../services/db';
import { reindexAllArticles } from '../../services/meilisearch';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.use(requirePermission('access.manage'));

// Reconstruye el índice de Meilisearch desde Postgres (post-migración o mantenimiento)
router.post('/reindex', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const count = await reindexAllArticles(pool);
    res.json({ data: { reindexed: count } });
  } catch (err) {
    next(err);
  }
});

export default router;
