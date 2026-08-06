// Unit tests for IP hashing middleware
import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { hashIp, IpHashRequest } from '../../../src/middleware/ip-hash';

describe('hashIp middleware', () => {
  const originalSalt = process.env.ANALYTICS_IP_SALT;

  beforeEach(() => {
    process.env.ANALYTICS_IP_SALT = 'test-salt-value';
  });

  afterAll(() => {
    process.env.ANALYTICS_IP_SALT = originalSalt;
  });

  function mockReq(ip: string): IpHashRequest {
    return { ip } as IpHashRequest;
  }

  function mockRes(): Response {
    return {} as Response;
  }

  it('attaches ipHash to the request', () => {
    const req = mockReq('192.168.1.1');
    const res = mockRes();
    const next: NextFunction = () => {};

    hashIp(req, res, next);

    expect(req.ipHash).toBeDefined();
    expect(typeof req.ipHash).toBe('string');
    expect(req.ipHash.length).toBe(64); // SHA-256 hex length
  });

  it('produces a valid SHA-256 hex hash', () => {
    const req = mockReq('10.0.0.1');
    const res = mockRes();
    const next: NextFunction = () => {};

    hashIp(req, res, next);

    const expected = createHash('sha256')
      .update('10.0.0.1' + 'test-salt-value')
      .digest('hex');

    expect(req.ipHash).toBe(expected);
  });

  it('produces different hashes for different IPs', () => {
    const req1 = mockReq('192.168.1.1');
    const req2 = mockReq('192.168.1.2');
    const res = mockRes();
    const next: NextFunction = () => {};

    hashIp(req1, res, next);
    hashIp(req2, res, next);

    expect(req1.ipHash).not.toBe(req2.ipHash);
  });

  it('produces the same hash for the same IP and salt', () => {
    const req1 = mockReq('192.168.1.1');
    const req2 = mockReq('192.168.1.1');
    const res = mockRes();
    const next: NextFunction = () => {};

    hashIp(req1, res, next);
    hashIp(req2, res, next);

    expect(req1.ipHash).toBe(req2.ipHash);
  });

  it('handles IPv6 loopback (::1)', () => {
    const req = mockReq('::1');
    const res = mockRes();
    const next: NextFunction = () => {};

    hashIp(req, res, next);

    expect(req.ipHash).toBeDefined();
    expect(req.ipHash.length).toBe(64);
  });

  it('calls next()', () => {
    const req = mockReq('127.0.0.1');
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    hashIp(req, res, next);

    expect(nextCalled).toBe(true);
  });

  it('uses fallback hash when ANALYTICS_IP_SALT is missing', () => {
    delete process.env.ANALYTICS_IP_SALT;
    const req = mockReq('192.168.1.1');
    const res = mockRes();
    const next: NextFunction = () => {};

    hashIp(req, res, next);

    // Should still produce a hash (with empty salt)
    expect(req.ipHash).toBeDefined();
    expect(req.ipHash.length).toBe(64);

    const expected = createHash('sha256')
      .update('192.168.1.1')
      .digest('hex');
    expect(req.ipHash).toBe(expected);
  });
});
