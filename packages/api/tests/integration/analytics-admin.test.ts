// Integration tests for admin analytics endpoints
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/index';
import { getPool } from '../../src/services/db';
import { resetRateLimitStore } from '../../src/middleware/rate-limit';

process.env.NODE_ENV = 'test';
process.env.ANALYTICS_IP_SALT = 'test-salt-admin';

const app = createApp();
const JWT_SECRET = 'test-jwt-secret-for-testing-only';

function generateAdminToken(permissions: string[] = ['article.review', 'article.publish']) {
  return jwt.sign({
    userId: 'admin-user-id',
    email: 'admin@test.com',
    role: { id: 'role-id', slug: 'superadmin', name: 'Superadmin' },
    permissions,
  }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Admin Analytics API', () => {
  beforeAll(async () => {
    const pool = getPool();
    // Ensure tables exist
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
    await pool.query('DELETE FROM analytics_rollups_daily');
    await pool.query('DELETE FROM analytics_events');
    resetRateLimitStore();
  });

  describe('GET /api/v1/analytics/admin/summary', () => {
    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/analytics/admin/summary');
      expect(res.status).toBe(401);
    });

    it('returns 403 without required permissions', async () => {
      const token = generateAdminToken(['article.create']); // No review/publish
      const res = await request(app)
        .get('/api/v1/analytics/admin/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns correct summary shape with data', async () => {
      const pool = getPool();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Insert rollup data
      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-1', 'es', 'google.com', 'desktop', 50)`,
        [today]
      );
      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-2', 'en', 'github.com', 'mobile', 30)`,
        [today]
      );

      // Insert events for unique visitor count
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash)
           VALUES ('page_view', 'article-1', 'es', 'google.com', 'desktop', $1)`,
          [`unique-hash-${i}`]
        );
      }

      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/v1/analytics/admin/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        total_views: 80,
        unique_visitors: 5,
        top_articles: expect.arrayContaining([
          expect.objectContaining({ slug: 'article-1', views: 50 }),
          expect.objectContaining({ slug: 'article-2', views: 30 }),
        ]),
        by_lang: expect.objectContaining({ es: 50, en: 30 }),
      });
      expect(res.body.data.daily_trend).toBeInstanceOf(Array);
    });

    // Los eventos emitidos desde el servidor (article_api, not_found en SSR) se
    // guardan con el ip_hash sintético 'server-side'. No son personas: si se
    // cuentan, unique_visitors arranca en 1 aunque no haya tráfico real.
    it('excluye el ip_hash sintético server-side de unique_visitors', async () => {
      const pool = getPool();

      for (let i = 0; i < 12; i++) {
        await pool.query(
          `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash)
           VALUES ('article_api', 'article-1', 'es', '', 'desktop', 'server-side')`
        );
      }
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash)
         VALUES ('page_view', 'article-1', 'es', '', 'desktop', $1)`,
        ['real-visitor-hash']
      );

      const res = await request(app)
        .get('/api/v1/analytics/admin/summary')
        .set('Authorization', `Bearer ${generateAdminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unique_visitors).toBe(1);
    });

    it('reporta 0 visitantes únicos cuando solo hubo tráfico server-side', async () => {
      const pool = getPool();
      await pool.query(
        `INSERT INTO analytics_events (event_type, slug, lang, referrer_domain, device_type, ip_hash)
         VALUES ('article_api', 'article-1', 'es', '', 'desktop', 'server-side')`
      );

      const res = await request(app)
        .get('/api/v1/analytics/admin/summary')
        .set('Authorization', `Bearer ${generateAdminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unique_visitors).toBe(0);
    });

    it('filters by lang', async () => {
      const pool = getPool();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-es', 'es', '', 'desktop', 40)`,
        [today]
      );
      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-en', 'en', '', 'desktop', 20)`,
        [today]
      );

      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/v1/analytics/admin/summary?lang=es')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_views).toBe(40);
    });

    it('filters by device_type', async () => {
      const pool = getPool();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-mobile', 'es', '', 'mobile', 25)`,
        [today]
      );
      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-desktop', 'es', '', 'desktop', 75)`,
        [today]
      );

      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/v1/analytics/admin/summary?device_type=mobile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_views).toBe(25);
    });

    it('combines filters', async () => {
      const pool = getPool();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-combo', 'es', 'google.com', 'mobile', 15)`,
        [today]
      );
      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'article-other', 'en', 'google.com', 'mobile', 10)`,
        [today]
      );

      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/v1/analytics/admin/summary?lang=es&device_type=mobile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_views).toBe(15);
    });

    it('respects days parameter', async () => {
      const pool = getPool();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oldDay = new Date(today);
      oldDay.setDate(oldDay.getDate() - 10);

      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'recent', 'es', '', 'desktop', 100)`,
        [today]
      );
      await pool.query(
        `INSERT INTO analytics_rollups_daily (day, event_type, slug, lang, referrer_domain, device_type, count)
         VALUES ($1, 'page_view', 'old', 'es', '', 'desktop', 200)`,
        [oldDay]
      );

      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/v1/analytics/admin/summary?days=7')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_views).toBe(100); // Only recent
    });
  });

  describe('GET /api/v1/analytics/admin/config', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/v1/analytics/admin/config');
      expect(res.status).toBe(401);
    });

    it('returns retention_days', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/v1/analytics/admin/config')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.retention_days).toBe(90);
    });
  });

  describe('PUT /api/v1/analytics/admin/config', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/v1/analytics/admin/config')
        .send({ retention_days: 30 });
      expect(res.status).toBe(401);
    });

    it('updates retention_days', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .put('/api/v1/analytics/admin/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ retention_days: 60 });

      expect(res.status).toBe(200);
      expect(res.body.data.retention_days).toBe(60);

      // Verify it persisted
      const getRes = await request(app)
        .get('/api/v1/analytics/admin/config')
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.body.data.retention_days).toBe(60);

      // Restore default
      await request(app)
        .put('/api/v1/analytics/admin/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ retention_days: 90 });
    });

    it('rejects non-integer retention_days', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .put('/api/v1/analytics/admin/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ retention_days: 30.5 });

      expect(res.status).toBe(400);
    });

    it('rejects zero or negative retention_days', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .put('/api/v1/analytics/admin/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ retention_days: 0 });

      expect(res.status).toBe(400);
    });
  });
});
