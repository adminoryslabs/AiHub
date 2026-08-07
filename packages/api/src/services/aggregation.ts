// Analytics aggregation service: hourly/daily rollups + retention purge
import cron, { ScheduledTask } from 'node-cron';
import { getPool } from './db';

let cronJob: ScheduledTask | null = null;

export async function aggregateHourly(): Promise<void> {
  const pool = getPool();

  // Aggregate raw events into hourly rollups.
  // La ventana mira 26 horas atrás, no solo la hora anterior: el cron corre a
  // los :05 y si el contenedor está caído en ese momento (deploy, reinicio) esa
  // hora no se agregaba nunca y el hueco quedaba permanente, porque
  // purgeOldEvents termina borrando los eventos crudos. Recalcular una ventana
  // amplia es seguro: el ON CONFLICT reescribe el count con el valor recontado
  // desde los eventos crudos, así que correrlo N veces da siempre lo mismo.
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
    WHERE created_at >= date_trunc('hour', NOW()) - INTERVAL '26 hours'
      AND created_at < date_trunc('hour', NOW())
    GROUP BY hour, event_type, slug, lang, referrer_domain, device_type
    ON CONFLICT (hour, event_type, slug, lang, referrer_domain, device_type)
    DO UPDATE SET count = EXCLUDED.count
  `);
}

/**
 * Aggregates the CURRENT (partial) hour into hourly rollups and refreshes
 * today's daily rollup. Called on demand from the admin dashboard so the
 * user can see real-time data without waiting for the cron at :05.
 * The cron still runs aggregateHourly() for the previous completed hour
 * and aggregateDaily() for the previous day — this function is additive
 * and uses ON CONFLICT to avoid double-counting when the cron later
 * re-aggregates the same hour.
 */
export async function aggregateCurrentHour(): Promise<void> {
  const pool = getPool();

  // 1. Insert/update the current hour in hourly rollups
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
    WHERE created_at >= date_trunc('hour', NOW())
    GROUP BY hour, event_type, slug, lang, referrer_domain, device_type
    ON CONFLICT (hour, event_type, slug, lang, referrer_domain, device_type)
    DO UPDATE SET count = EXCLUDED.count
  `);

  // 2. Refresh today's daily rollup so the dashboard's total_views
  //    and daily_trend include the current partial hour.
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
    WHERE hour >= date_trunc('day', NOW())
    GROUP BY day, event_type, slug, lang, referrer_domain, device_type
    ON CONFLICT (day, event_type, slug, lang, referrer_domain, device_type)
    DO UPDATE SET count = EXCLUDED.count
  `);
}

export async function aggregateDaily(): Promise<void> {
  const pool = getPool();

  // Aggregate hourly rollups into daily rollups.
  // Igual que en aggregateHourly, la ventana cubre varios días en vez de solo
  // ayer para que un día que el cron se perdió se recupere en la corrida
  // siguiente. Hoy queda excluido a propósito: lo refresca aggregateCurrentHour.
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
    WHERE hour >= date_trunc('day', NOW()) - INTERVAL '3 days'
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
