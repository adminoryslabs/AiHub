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

  function mockReq(ip: string, headers: Record<string, string> = {}): IpHashRequest {
    return { ip, headers } as unknown as IpHashRequest;
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

  // La API vive detrás de Cloudflare + túnel cloudflared, así que req.ip es
  // siempre el gateway de Docker. Sin resolver la IP real, todos los visitantes
  // colapsan en un único hash y unique_visitors queda clavado.
  describe('resolución de IP real de cliente detrás de proxy', () => {
    const next: NextFunction = () => {};

    it('prefiere CF-Connecting-IP por encima de req.ip', () => {
      const req = mockReq('::ffff:172.19.0.1', { 'cf-connecting-ip': '203.0.113.7' });

      hashIp(req, mockRes(), next);

      const expected = createHash('sha256')
        .update('203.0.113.7' + 'test-salt-value')
        .digest('hex');
      expect(req.ipHash).toBe(expected);
    });

    it('usa la entrada más a la izquierda de X-Forwarded-For si no hay CF-Connecting-IP', () => {
      const req = mockReq('::ffff:172.19.0.1', {
        'x-forwarded-for': '203.0.113.9, 70.41.3.18, 172.19.0.1',
      });

      hashIp(req, mockRes(), next);

      const expected = createHash('sha256')
        .update('203.0.113.9' + 'test-salt-value')
        .digest('hex');
      expect(req.ipHash).toBe(expected);
    });

    it('da hashes distintos a dos clientes reales detrás del mismo proxy', () => {
      const a = mockReq('::ffff:172.19.0.1', { 'cf-connecting-ip': '203.0.113.7' });
      const b = mockReq('::ffff:172.19.0.1', { 'cf-connecting-ip': '198.51.100.4' });

      hashIp(a, mockRes(), next);
      hashIp(b, mockRes(), next);

      expect(a.ipHash).not.toBe(b.ipHash);
    });

    it('normaliza el prefijo IPv4-mapped ::ffff: para no duplicar visitantes', () => {
      const mapped = mockReq('unused', { 'cf-connecting-ip': '::ffff:203.0.113.7' });
      const plain = mockReq('unused', { 'cf-connecting-ip': '203.0.113.7' });

      hashIp(mapped, mockRes(), next);
      hashIp(plain, mockRes(), next);

      expect(mapped.ipHash).toBe(plain.ipHash);
    });

    it('cae a req.ip cuando no hay headers de proxy', () => {
      const req = mockReq('192.168.1.50');

      hashIp(req, mockRes(), next);

      const expected = createHash('sha256')
        .update('192.168.1.50' + 'test-salt-value')
        .digest('hex');
      expect(req.ipHash).toBe(expected);
    });

    it('ignora headers de proxy vacíos y cae a req.ip', () => {
      const req = mockReq('192.168.1.50', { 'cf-connecting-ip': '  ', 'x-forwarded-for': '' });

      hashIp(req, mockRes(), next);

      const expected = createHash('sha256')
        .update('192.168.1.50' + 'test-salt-value')
        .digest('hex');
      expect(req.ipHash).toBe(expected);
    });
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
