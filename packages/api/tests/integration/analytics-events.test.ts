// Integration tests for analytics events endpoint
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/index';
import { getPool } from '../../src/services/db';
import { resetRateLimitStore } from '../../src/middleware/rate-limit';

process.env.NODE_ENV = 'test';
process.env.ANALYTICS_IP_SALT = 'test-salt-for-integration';

const app = createApp();

describe('POST /api/v1/analytics/events', () => {
  beforeAll(async () => {
    // Ensure analytics tables exist in test DB
    const pool = getPool();
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
  });

  beforeEach(async () => {
    // Clear events between tests
    const pool = getPool();
    await pool.query('DELETE FROM analytics_events');
    // Reset rate limiter state
    resetRateLimitStore();
  });

  it('returns 202 for a valid page_view event', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'page_view',
        slug: 'prompt-engineering',
        lang: 'es',
        referrer: 'google.com',
        device_type: 'desktop',
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });
  });

  it('persists the event with IP hash in the database', async () => {
    await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'page_view',
        slug: 'test-article',
        lang: 'en',
        referrer: 'github.com',
        device_type: 'mobile',
      });

    const pool = getPool();
    const result = await pool.query(
      'SELECT event_type, slug, lang, referrer_domain, device_type, ip_hash FROM analytics_events ORDER BY created_at DESC LIMIT 1'
    );

    expect(result.rows.length).toBe(1);
    const row = result.rows[0];
    expect(row.event_type).toBe('page_view');
    expect(row.slug).toBe('test-article');
    expect(row.lang).toBe('en');
    expect(row.referrer_domain).toBe('github.com');
    expect(row.device_type).toBe('mobile');
    expect(row.ip_hash).toBeDefined();
    expect(row.ip_hash.length).toBe(64); // SHA-256 hex
  });

  it('returns 400 for missing event_type', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        slug: 'test',
        lang: 'es',
        referrer: null,
        device_type: 'desktop',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid lang', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'page_view',
        slug: 'test',
        lang: 'fr',
        referrer: null,
        device_type: 'desktop',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid device_type', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'page_view',
        slug: 'test',
        lang: 'es',
        referrer: null,
        device_type: 'smartwatch',
      });

    expect(res.status).toBe(400);
  });

  it('accepts search events with query and results_count', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'search',
        slug: null,
        lang: 'es',
        referrer: null,
        device_type: 'desktop',
        query: 'rag',
        results_count: 5,
      });

    expect(res.status).toBe(202);

    const pool = getPool();
    const result = await pool.query(
      'SELECT query, results_count FROM analytics_events WHERE event_type = $1',
      ['search']
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].query).toBe('rag');
    expect(result.rows[0].results_count).toBe(5);
  });

  it('accepts not_found events with extra.path', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'not_found',
        slug: null,
        lang: 'es',
        referrer: null,
        device_type: 'desktop',
        extra: { path: '/es/herramientas/no-existe' },
      });

    expect(res.status).toBe(202);

    const pool = getPool();
    const result = await pool.query(
      'SELECT extra FROM analytics_events WHERE event_type = $1',
      ['not_found']
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].extra).toEqual({ path: '/es/herramientas/no-existe' });
  });

  it('returns 429 after exceeding rate limit (100 requests/min)', async () => {
    // Send 100 requests to exhaust the bucket
    for (let i = 0; i < 100; i++) {
      const res = await request(app)
        .post('/api/v1/analytics/events')
        .send({
          event_type: 'page_view',
          slug: 'rate-limit-test',
          lang: 'es',
          referrer: null,
          device_type: 'desktop',
        });
      expect(res.status).toBe(202);
    }

    // 101st request should be rate limited
    const res = await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'page_view',
        slug: 'rate-limit-test',
        lang: 'es',
        referrer: null,
        device_type: 'desktop',
      });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not store raw IP — only the hash', async () => {
    await request(app)
      .post('/api/v1/analytics/events')
      .send({
        event_type: 'page_view',
        slug: 'ip-hash-test',
        lang: 'es',
        referrer: null,
        device_type: 'desktop',
      });

    const pool = getPool();
    const result = await pool.query(
      'SELECT ip_hash FROM analytics_events WHERE slug = $1',
      ['ip-hash-test']
    );

    expect(result.rows.length).toBe(1);
    // ip_hash should be a 64-char hex string (SHA-256), not a raw IP
    expect(result.rows[0].ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.rows[0].ip_hash).not.toContain('127.0.0.1');
    expect(result.rows[0].ip_hash).not.toContain('::1');
  });
});
