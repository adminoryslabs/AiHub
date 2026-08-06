// In-memory token-bucket rate limiter for analytics endpoints
import { Request, Response, NextFunction } from 'express';

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

const MAX_TOKENS = 100;
const REFILL_INTERVAL_MS = 60_000; // 1 minute

// Store keyed by IP hash
const store = new Map<string, BucketEntry>();

export function resetRateLimitStore(): void {
  store.clear();
}

// Export for testing only
export function _getStoreForTesting(): Map<string, BucketEntry> {
  return store;
}

function refill(bucket: BucketEntry, now: number): void {
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= REFILL_INTERVAL_MS) {
    // Full refill after interval
    bucket.tokens = MAX_TOKENS;
    bucket.lastRefill = now;
  }
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ipHash = (req as Request & { ipHash?: string }).ipHash || req.ip || 'unknown';
  const now = Date.now();

  let bucket = store.get(ipHash);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    store.set(ipHash, bucket);
  }

  refill(bucket, now);

  if (bucket.tokens <= 0) {
    const retryAfter = Math.ceil((bucket.lastRefill + REFILL_INTERVAL_MS - now) / 1000);
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again later.',
        retry_after_seconds: retryAfter,
      },
    });
    return;
  }

  bucket.tokens -= 1;
  next();
}
