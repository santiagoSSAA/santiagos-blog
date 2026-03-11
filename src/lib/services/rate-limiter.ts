export interface RateLimiter {
  isLimited(key: string): boolean;
}

export function createInMemoryRateLimiter(
  windowMs: number,
  maxRequests: number
): RateLimiter {
  const map = new Map<string, { count: number; resetAt: number }>();

  return {
    isLimited(key) {
      const now = Date.now();
      const entry = map.get(key);

      if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return false;
      }

      entry.count++;
      return entry.count > maxRequests;
    },
  };
}
