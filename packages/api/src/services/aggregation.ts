// Analytics aggregation service: hourly/daily rollups + retention purge
import cron from 'node-cron';
import { getPool } from './db';

let cronJob: cron.ScheduledTask | null = null;

export async function aggregateHourly(): Promise<void> {
  const pool = getPool();

  // Aggregate raw events into hourly rollups
  await pool.query(`
    INSERT INTO analytics_rollups_hourly (hour, event_type, slug, lang, referrer_domain, device_type, count)
    SELECT
      date_trunc('hour', created_at) AS hour,
      event_type,
      COALESCE(slug, '') AS slug,
      lang,
      COALESCE(referrer_domain, '') AS referrer_domain,
      device_type,
      COUNT(*)::int AS count
    FROM analytics_events
    WHERE created_at >= date_trunc('hour', NOW()) - INTERVAL '1 hour'
      AND created_at < date_trunc('hour', NOW())
    GROUP BY hour, event_type, slug, lang, referrer_domain, device_type
    ON CONFLICT (hour, event_type, slug, lang, referrer_domain, device_type)
    DO UPDATE SET count = EXCLUDED.count
  `);
}

export async function aggregateDaily(): Promise<void> {
  const pool = getPool();

  // Aggregate hourly rollups into daily rollups
  await pool.query(`
    INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
    SELECT
      date_trunc('day', hour) AS day,
      event_type,
      slug,
      lang,
      referrer_domain,
      device_type,
      SUM(count)::int AS count
    FROM analytics_rollups_hourly
    WHERE hour >= date_trunc('day', NOW()) - INTERVAL '1 day'
      AND hour < date_trunc('day', NOW())
    GROUP BY day, event_type, slug, lang, referrer_domain, device_type
    ON CONFLICT (day, event_type, slug, lang, referrer_domain, device_type)
    DO UPDATE SET count = EXCLUDED.count
  `);
}

export async function purgeOldEvents(): Promise<number> {
  const pool = getPool();

  // Read retention period from config
  const configResult = await pool.query(
    `SELECT value FROM analytics_config WHERE key = 'retention_days'`
  );
  const retentionDays = parseInt(configResult.rows[0]?.value || '90', 10);

  const result = await pool.query(
    `DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`
  );

  return result.rowCount || 0;
}

async function runAggregation(): Promise<void> {
  try {
    await aggregateHourly();
    await aggregateDaily();
    await purgeOldEvents();
  } catch (err) {
    process.stderr.write(`[aggregation] Error: ${(err as Error).message}\n`);
  }
}

export function startAggregationCron(): void {
  if (cronJob) return; // Already started

  // Run every hour at minute 5
  cronJob = cron.schedule('5 * * * *', runAggregation, {
    scheduled: true,
    timezone: 'UTC',
  });

  process.stderr.write('[aggregation] Cron job scheduled (every hour at :05)\n');
}

export function stopAggregationCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}
