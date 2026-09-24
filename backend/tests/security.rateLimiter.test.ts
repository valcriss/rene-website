import { createRequestRateLimiter, enforceRequestRateLimit } from "../src/security/rateLimiter";

const policy = {
  action: "test",
  ip: { max: 1, windowMs: 1_000 },
  actor: { max: 1, windowMs: 1_000 }
};

describe("request rate limiter", () => {
  it("uses persistent hashed keys for both IP and authenticated actor", async () => {
    const consumeRateLimit = jest.fn(async (input: { key: string }) => ({
      allowed: input.key.length > 0,
      retryAfterSeconds: 0
    }));
    const limiter = createRequestRateLimiter({ consumeRateLimit });

    await expect(limiter.check(policy, "203.0.113.42", "user-42")).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });

    expect(consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(consumeRateLimit.mock.calls.map(([input]) => input.key)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^abuse:test:ip:[a-f0-9]{64}$/), expect.stringMatching(/^abuse:test:actor:[a-f0-9]{64}$/)])
    );
    expect(JSON.stringify(consumeRateLimit.mock.calls)).not.toContain("203.0.113.42");
    expect(JSON.stringify(consumeRateLimit.mock.calls)).not.toContain("user-42");
  });

  it("stops at the first persistent refusal", async () => {
    const consumeRateLimit = jest.fn(async () => ({ allowed: false, retryAfterSeconds: 12 }));
    const limiter = createRequestRateLimiter({ consumeRateLimit });

    await expect(limiter.check(policy, "127.0.0.1", "user-1")).resolves.toEqual({ allowed: false, retryAfterSeconds: 12 });
    expect(consumeRateLimit).toHaveBeenCalledTimes(1);
  });

  it("expires and bounds the development fallback store", async () => {
    let now = new Date("2026-01-01T00:00:00.000Z");
    const limiter = createRequestRateLimiter(undefined, () => now);

    await expect(limiter.check(policy, "127.0.0.1")).resolves.toMatchObject({ allowed: true });
    await expect(limiter.check(policy, "127.0.0.1")).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    now = new Date(now.getTime() + 1_000);
    await expect(limiter.check(policy, "127.0.0.1")).resolves.toMatchObject({ allowed: true });

    for (let index = 0; index <= 1_000; index += 1) {
      await limiter.check({ ...policy, action: `bounded-${index}` }, "127.0.0.1");
    }
    await expect(limiter.check({ ...policy, action: "bounded-0" }, "127.0.0.1")).resolves.toMatchObject({ allowed: true });

    now = new Date(now.getTime() + 60 * 60 * 1_000);
    await expect(limiter.check({ ...policy, action: "after-prune" }, "127.0.0.1")).resolves.toMatchObject({ allowed: true });
  });

  it("returns a 429 with retry information when a request is refused", async () => {
    const limiter = createRequestRateLimiter({
      consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 7 })
    });
    const res = { set: jest.fn(), status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(enforceRequestRateLimit(limiter, { user: { id: "u" } } as never, res as never, policy)).resolves.toBe(false);
    expect(res.set).toHaveBeenCalledWith("Retry-After", "7");
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ errors: ["Trop de requêtes. Réessayez plus tard."] });
    expect(warnSpy).toHaveBeenCalledWith("Rate limit reached", { action: "test", authenticated: true });
    warnSpy.mockRestore();
  });

  it("allows a request that remains under its quota", async () => {
    const limiter = createRequestRateLimiter({
      consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 })
    });
    const res = { set: jest.fn(), status: jest.fn(), json: jest.fn() };

    await expect(enforceRequestRateLimit(limiter, { ip: "127.0.0.1" } as never, res as never, policy)).resolves.toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });
});
