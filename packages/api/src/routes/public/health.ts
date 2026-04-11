// Endpoint de health check
import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../../services/db';
import { checkMeilisearchConnection } from '../../services/meilisearch';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const [dbOk, meiliOk] = await Promise.all([
    checkDbConnection(),
    checkMeilisearchConnection(),
  ]);

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
      meilisearch: meiliOk ? 'connected' : 'disconnected',
    },
  });
});

export default router;
