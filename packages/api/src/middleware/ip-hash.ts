// Middleware: hash client IP with SHA-256 + salt for anonymous analytics
import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface IpHashRequest extends Request {
  ipHash?: string;
}

export function hashIp(req: IpHashRequest, _res: Response, next: NextFunction): void {
  const salt = process.env.ANALYTICS_IP_SALT || '';
  if (!process.env.ANALYTICS_IP_SALT) {
    process.stderr.write(
      'WARNING: ANALYTICS_IP_SALT not set — IP hash uses empty salt. Set this env var in production.\n'
    );
  }

  const clientIp = req.ip || 'unknown';
  const hash = createHash('sha256')
    .update(clientIp + salt)
    .digest('hex');

  req.ipHash = hash;
  next();
}
