// Shared analytics event emitter — used by middleware hooks to emit events directly
import { getPool } from '../services/db';

export async function emitAnalyticsEvent(params: {
  event_type: string;
  slug?: string | null;
  lang: string;
  referrer?: string | null;
  device_type?: string;
  ip_hash?: string;
  query?: string | null;
  results_count?: number | null;
  extra?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO analytics_events
        (event_type, slug, lang, referrer_domain, device_type, ip_hash, query, results_count, extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.event_type,
        params.slug || null,
        params.lang,
        params.referrer || null,
        params.device_type || 'desktop',
        params.ip_hash || 'server-side',
        params.query || null,
        params.results_count ?? null,
        params.extra ? JSON.stringify(params.extra) : null,
      ]
    );
  } catch (err) {
    // Silent failure — analytics should never break the main flow
    process.stderr.write(`[analytics] Failed to emit event: ${(err as Error).message}\n`);
  }
}
