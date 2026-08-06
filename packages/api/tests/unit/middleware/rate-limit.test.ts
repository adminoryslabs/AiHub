// Unit tests for in-memory token-bucket rate limiter
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { rateLimit, resetRateLimitStore, _getStoreForTesting } from '../../../src/middleware/rate-limit';

describe('rateLimit middleware', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  function mockReq(ipHash: string): Request {
    return { ipHash } as unknown as Request;
  }

  function mockRes(): Response & { statusCode: number; jsonBody: unknown } {
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.jsonBody = body;
        return this;
      },
    } as unknown as Response & { statusCode: number; jsonBody: unknown };
    return res;
  }

  it('allows requests under the limit', () => {
    const req = mockReq('hash-1');
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    rateLimit(req, res, next);

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('allows up to 100 requests per minute per IP hash', () => {
    const res = mockRes();
    const next: NextFunction = () => {};

    for (let i = 0; i < 100; i++) {
      const req = mockReq('hash-burst');
      rateLimit(req, res, next);
      expect(res.statusCode).toBe(200);
    }
  });

  it('returns 429 after 100 requests in the same minute', () => {
    const res = mockRes();
    const next: NextFunction = () => {};

    // Exhaust the bucket
    for (let i = 0; i < 100; i++) {
      rateLimit(mockReq('hash-limit'), res, next);
    }

    // 101st request should be rejected
    rateLimit(mockReq('hash-limit'), res, next);
    expect(res.statusCode).toBe(429);
    expect(res.jsonBody).toMatchObject({
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('tracks different IP hashes independently', () => {
    const res = mockRes();
    const next: NextFunction = () => {};

    // Exhaust bucket for hash-a
    for (let i = 0; i < 100; i++) {
      rateLimit(mockReq('hash-a'), res, next);
    }

    // hash-b should still be allowed
    const reqB = mockReq('hash-b');
    rateLimit(reqB, res, next);
    expect(res.statusCode).toBe(200);
  });

  it('refills tokens after time passes', () => {
    const res = mockRes();
    const next: NextFunction = () => {};

    // Exhaust bucket
    for (let i = 0; i < 100; i++) {
      rateLimit(mockReq('hash-refill'), res, next);
    }

    // 101st should fail
    rateLimit(mockReq('hash-refill'), res, next);
    expect(res.statusCode).toBe(429);

    // Manually set lastRefill to 61 seconds ago to trigger refill (buffer for timing)
    const store = _getStoreForTesting();
    const bucket = store.get('hash-refill');
    expect(bucket).toBeDefined();
    if (bucket) {
      bucket.lastRefill = Date.now() - 61_000;
    }

    // Should be allowed again — use a fresh res object
    const res2 = mockRes();
    const req = mockReq('hash-refill');
    rateLimit(req, res2, next);
    expect(res2.statusCode).toBe(200);
  });

  it('returns 429 with retry-after hint', () => {
    const res = mockRes();
    const next: NextFunction = () => {};

    for (let i = 0; i < 100; i++) {
      rateLimit(mockReq('hash-retry'), res, next);
    }

    rateLimit(mockReq('hash-retry'), res, next);
    expect(res.statusCode).toBe(429);
    expect((res.jsonBody as { error: { retry_after_seconds?: number } }).error.retry_after_seconds).toBeDefined();
  });
});
