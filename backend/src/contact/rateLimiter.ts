export type RateLimiter = {
  isAllowed: (key: string) => boolean;
};

export const createRateLimiter = (options: { max: number; windowMs: number }): RateLimiter => {
  const hits = new Map<string, number[]>();

  return {
    isAllowed: (key: string) => {
      const now = Date.now();
      const recentHits = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < options.windowMs);

      if (recentHits.length >= options.max) {
        hits.set(key, recentHits);
        return false;
      }

      recentHits.push(now);
      hits.set(key, recentHits);
      return true;
    }
  };
};
