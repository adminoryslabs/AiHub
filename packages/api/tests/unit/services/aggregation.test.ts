// Unit tests for analytics aggregation service
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getPool } from '../../../src/services/db';
import { aggregateHourly, aggregateDaily, purgeOldEvents } from '../../../src/services/aggregation';

describe('aggregation service', () => {
  beforeAll(async () => {
    const pool = getPool();
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        event_type VARCHAR(30) NOT NULL,
        slug VARCHAR(200),
        lang CHAR(2) NOT NULL,
        referrer_domain VARCHAR(500),
        device_type VARCHAR(10) NOT NULL,
        ip_hash CHAR(64) NOT NULL,
        query VARCHAR(500),
        results_count INT,
        extra JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_rollups_hourly (
        hour TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        slug VARCHAR(200) NOT NULL DEFAULT '',
        lang CHAR(2) NOT NULL,
        referrer_domain VARCHAR(500) NOT NULL DEFAULT '',
        device_type VARCHAR(10) NOT NULL,
        count INT NOT NULL DEFAULT 0,
        PRIMARY KEY (hour, event_type, slug, lang, referrer_domain, device_type)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_rollups_daily (
        day TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        slug VARCHAR(200) NOT NULL DEFAULT '',
        lang CHAR(2) NOT NULL,
        referrer_domain VARCHAR(500) NOT NULL DEFAULT '',
        device_type VARCHAR(10) NOT NULL,
        count INT NOT NULL DEFAULT 0,
        PRIMARY KEY (day, event_type, slug, lang, referrer_domain, device_type)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await pool.query(`
      INSERT INTO analytics_config (key, value) VALUES ('retention_days', '90')
      ON CONFLICT (key) DO NOTHING
    `);
  });

  beforeEach(async () => {
    const pool = getPool();
    await pool.query('DELETE FROM analytics_events');
    await pool.query('DELETE FROM analytics_rollups_hourly');
    await pool.query('DELETE FROM analytics_rollups_daily');
  });

  describe('aggregateHourly', () => {
    it('creates hourly rollup from raw events', async () => {
      const pool = getPool();
      // Insert 5 page_view events for the same slug in the PREVIOUS hour
      const prevHour = new Date();
      prevHour.setHours(prevHour.getHours() - 1);
      prevHour.setMinutes(30); // Middle of the previous hour

      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
           VALUES ('page_view', 'test-article', 'es', 'google.com', 'desktop', $1, $2)`,
          [`hash-${i}`, prevHour]
        );
      }

      await aggregateHourly();

      const result = await pool.query(
        'SELECT count FROM analytics_rollups_hourly WHERE event_type = $1 AND slug = $2',
        ['page_view', 'test-article']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].count).toBe(5);
    });

    // El cron corre a los :05 de cada hora. Si el contenedor está caído en ese
    // momento (deploy, reinicio, caída), esa hora no se agregaba nunca: la
    // ventana cubría exactamente la hora anterior y no había recuperación.
    // Como purgeOldEvents borra los eventos crudos a los 90 días, el hueco
    // terminaba siendo permanente.
    it('recupera horas anteriores que el cron se perdió', async () => {
      const pool = getPool();
      const now = new Date();

      // Eventos de hace 5 horas: con la ventana vieja quedaban fuera.
      const cincoHorasAtras = new Date(now.getTime() - 5 * 3600_000);
      cincoHorasAtras.setMinutes(20, 0, 0);
      for (let i = 0; i < 4; i++) {
        await pool.query(
          `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
           VALUES ('page_view', 'hora-perdida', 'es', '', 'desktop', $1, $2)`,
          [`hash-perdida-${i}`, cincoHorasAtras]
        );
      }

      await aggregateHourly();

      const result = await pool.query(
        'SELECT SUM(count)::int AS total FROM analytics_rollups_hourly WHERE slug = $1',
        ['hora-perdida']
      );
      expect(result.rows[0].total).toBe(4);
    });

    it('no cuenta dos veces al recuperar una hora ya agregada', async () => {
      const pool = getPool();
      const tresHorasAtras = new Date(Date.now() - 3 * 3600_000);
      tresHorasAtras.setMinutes(40, 0, 0);

      for (let i = 0; i < 6; i++) {
        await pool.query(
          `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
           VALUES ('page_view', 'sin-doble-conteo', 'es', '', 'desktop', $1, $2)`,
          [`hash-doble-${i}`, tresHorasAtras]
        );
      }

      await aggregateHourly();
      await aggregateHourly();
      await aggregateHourly();

      const result = await pool.query(
        'SELECT SUM(count)::int AS total FROM analytics_rollups_hourly WHERE slug = $1',
        ['sin-doble-conteo']
      );
      expect(result.rows[0].total).toBe(6);
    });

    it('is idempotent — running twice produces the same count', async () => {
      const pool = getPool();
      const prevHour = new Date();
      prevHour.setHours(prevHour.getHours() - 1);
      prevHour.setMinutes(15);

      for (let i = 0; i < 3; i++) {
        await pool.query(
          `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
           VALUES ('page_view', 'idempotent-test', 'en', null, 'mobile', $1, $2)`,
          [`hash-idem-${i}`, prevHour]
        );
      }

      await aggregateHourly();
      await aggregateHourly(); // Run again

      const result = await pool.query(
        'SELECT count FROM analytics_rollups_hourly WHERE slug = $1',
        ['idempotent-test']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].count).toBe(3); // Not 6
    });

    it('handles empty events table', async () => {
      await aggregateHourly(); // Should not throw

      const pool = getPool();
      const result = await pool.query('SELECT COUNT(*)::int as cnt FROM analytics_rollups_hourly');
      expect(result.rows[0].cnt).toBe(0);
    });

    it('groups by dimensions (slug, lang, device_type)', async () => {
      const pool = getPool();
      const prevHour = new Date();
      prevHour.setHours(prevHour.getHours() - 1);
      prevHour.setMinutes(45);

      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
         VALUES ('page_view', 'article-a', 'es', 'google.com', 'desktop', 'h1', $1)`,
        [prevHour]
      );
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
         VALUES ('page_view', 'article-a', 'en', 'google.com', 'desktop', 'h2', $1)`,
        [prevHour]
      );
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
         VALUES ('page_view', 'article-b', 'es', 'github.com', 'mobile', 'h3', $1)`,
        [prevHour]
      );

      await aggregateHourly();

      const result = await pool.query(
        'SELECT slug, lang, device_type, count FROM analytics_rollups_hourly ORDER BY slug, lang'
      );

      expect(result.rows.length).toBe(3);
      expect(result.rows[0]).toMatchObject({ slug: 'article-a', lang: 'en', device_type: 'desktop', count: 1 });
      expect(result.rows[1]).toMatchObject({ slug: 'article-a', lang: 'es', device_type: 'desktop', count: 1 });
      expect(result.rows[2]).toMatchObject({ slug: 'article-b', lang: 'es', device_type: 'mobile', count: 1 });
    });
  });

  describe('aggregateDaily', () => {
    it('creates daily rollup from hourly rollups', async () => {
      const pool = getPool();
      // La ventana de aggregateDaily se calcula con date_trunc('day', NOW())
      // en la base, que trabaja en UTC. Construir "ayer" en hora local hacía
      // que el test fallara según la hora del día: con TZ=-05, después de las
      // 19:00 local ya es el día siguiente en UTC y la fila caía fuera de la
      // ventana. Se construye en UTC para que coincida con la consulta real.
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(10, 0, 0, 0);

      await pool.query(
        `INSERT INTO analytics_rollups_hourly (hour, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'daily-test', 'es', 'google.com', 'desktop', 10)`,
        [yesterday]
      );
      await pool.query(
        `INSERT INTO analytics_rollups_hourly (hour, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'daily-test', 'es', 'google.com', 'desktop', 5)`,
        [new Date(yesterday.getTime() + 3600_000)] // +1 hour
      );

      await aggregateDaily();

      const result = await pool.query(
        'SELECT count FROM analytics_rollups_daily WHERE slug = $1',
        ['daily-test']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].count).toBe(15);
    });

    it('is idempotent', async () => {
      const pool = getPool();
      // Mismo motivo que arriba: la ventana es UTC, la fecha se construye en UTC.
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(14, 0, 0, 0);

      await pool.query(
        `INSERT INTO analytics_rollups_hourly (hour, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'daily-idem', 'es', '', 'desktop', 7)`,
        [yesterday]
      );

      await aggregateDaily();
      await aggregateDaily();

      const result = await pool.query(
        'SELECT count FROM analytics_rollups_daily WHERE slug = $1',
        ['daily-idem']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].count).toBe(7);
    });
  });

  describe('purgeOldEvents', () => {
    it('deletes events older than retention period', async () => {
      const pool = getPool();
      // Insert an old event (100 days ago)
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
         VALUES ('page_view', 'old-event', 'es', null, 'desktop', 'hash-old', NOW() - INTERVAL '100 days')`
      );
      // Insert a recent event (1 day ago)
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
         VALUES ('page_view', 'recent-event', 'es', null, 'desktop', 'hash-new', NOW() - INTERVAL '1 day')`
      );

      const deleted = await purgeOldEvents();

      expect(deleted).toBe(1);

      const remaining = await pool.query('SELECT slug FROM analytics_events');
      expect(remaining.rows.length).toBe(1);
      expect(remaining.rows[0].slug).toBe('recent-event');
    });

    it('does not delete recent events', async () => {
      const pool = getPool();
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash)
         VALUES ('page_view', 'keep-me', 'es', null, 'desktop', 'hash-keep')`
      );

      const deleted = await purgeOldEvents();
      expect(deleted).toBe(0);

      const remaining = await pool.query('SELECT COUNT(*)::int as cnt FROM analytics_events');
      expect(remaining.rows[0].cnt).toBe(1);
    });

    it('uses retention_days from analytics_config', async () => {
      const pool = getPool();
      // Set retention to 7 days
      await pool.query(
        `UPDATE analytics_config SET value = '7' WHERE key = 'retention_days'`
      );

      // Insert event 10 days ago
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash, created_at)
         VALUES ('page_view', 'old-7d', 'es', null, 'desktop', 'hash-7d', NOW() - INTERVAL '10 days')`
      );

      const deleted = await purgeOldEvents();
      expect(deleted).toBe(1);

      // Restore default
      await pool.query(
        `UPDATE analytics_config SET value = '90' WHERE key = 'retention_days'`
      );
    });
  });
});
