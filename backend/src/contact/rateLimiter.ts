export type RateLimiter = {
  isAllowed: (key: string) => boolean;
};

export const createRateLimiter = (options: { max: number; windowMs: number }): RateLimiter => {
  const hits = new Map<string, number[]>();
  const maximumKeys = 1_000;

  return {
    isAllowed: (key: string) => {
      const now = Date.now();
      for (const [existingKey, timestamps] of hits) {
        if (timestamps.every((timestamp) => now - timestamp >= options.windowMs)) hits.delete(existingKey);
      }
      while (!hits.has(key) && hits.size >= maximumKeys) {
        hits.delete(hits.keys().next().value as string);
      }
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
