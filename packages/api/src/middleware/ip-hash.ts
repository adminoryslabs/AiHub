// Middleware: hash client IP with SHA-256 + salt for anonymous analytics
import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface IpHashRequest extends Request {
  ipHash?: string;
}

// Normaliza direcciones IPv4-mapped (::ffff:203.0.113.7 -> 203.0.113.7) para que
// un mismo cliente no genere dos hashes distintos según cómo llegue la conexión.
function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice('::ffff:'.length) : trimmed;
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  // X-Forwarded-For puede traer una cadena "cliente, proxy1, proxy2": el cliente
  // real es siempre la entrada más a la izquierda.
  const candidate = raw.split(',')[0]?.trim();
  return candidate ? candidate : null;
}

// La API corre detrás de Cloudflare + túnel cloudflared, así que el peer TCP que
// ve Express es siempre el gateway de Docker. Si usáramos req.ip directamente,
// todos los visitantes colapsarían en un único hash y unique_visitors quedaría
// clavado. Preferimos CF-Connecting-IP, que Cloudflare setea en cada request y
// el cliente no puede falsificar (Cloudflare lo sobrescribe en el borde).
export function resolveClientIp(req: Request): string {
  const headers = req.headers || {};
  const cfIp = firstHeaderValue(headers['cf-connecting-ip']);
  if (cfIp) return normalizeIp(cfIp);

  const forwarded = firstHeaderValue(headers['x-forwarded-for']);
  if (forwarded) return normalizeIp(forwarded);

  return normalizeIp(req.ip || 'unknown');
}

export function hashIp(req: IpHashRequest, _res: Response, next: NextFunction): void {
  const salt = process.env.ANALYTICS_IP_SALT || '';
  if (!process.env.ANALYTICS_IP_SALT) {
    process.stderr.write(
      'WARNING: ANALYTICS_IP_SALT not set — IP hash uses empty salt. Set this env var in production.\n'
    );
  }

  const clientIp = resolveClientIp(req);
  const hash = createHash('sha256')
    .update(clientIp + salt)
    .digest('hex');

  req.ipHash = hash;
  next();
}
