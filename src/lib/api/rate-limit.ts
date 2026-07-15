import type { NextRequest } from 'next/server';

/** Client IP from trusted reverse-proxy/CDN headers over the spoofable x-forwarded-for chain. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  );
}

/** In-memory fixed-window rate limiter. Returns `true` when the request is allowed. */
export function makeRateLimiter(limit: number, windowMs = 60_000) {
  const map = new Map<string, { count: number; resetAt: number }>();
  return function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = map.get(ip);
    if (!entry || now > entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  };
}
