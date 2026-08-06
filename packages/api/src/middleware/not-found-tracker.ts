// Middleware: emit analytics not_found event for unmatched Express routes
import { Request, Response, NextFunction } from 'express';
import { emitAnalyticsEvent } from '../services/analytics-emitter';

export function notFoundTracker(req: Request, res: Response, next: NextFunction): void {
  // Only track if no response has been sent yet (route didn't match)
  if (!res.headersSent) {
    // Fire-and-forget event emission
    emitAnalyticsEvent({
      event_type: 'not_found',
      slug: null,
      lang: (req.query.lang as string) || 'es',
      referrer: (req.headers.referer as string) || null,
      device_type: 'desktop',
      extra: { path: req.originalUrl || req.url },
    }).catch(() => {});
  }

  next();
}
