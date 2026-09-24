import { createRateLimiter } from "../src/contact/rateLimiter";

describe("createRateLimiter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows up to the configured maximum for a given key", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });

    expect(limiter.isAllowed("1.2.3.4")).toBe(true);
    expect(limiter.isAllowed("1.2.3.4")).toBe(true);
    expect(limiter.isAllowed("1.2.3.4")).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });

    expect(limiter.isAllowed("1.2.3.4")).toBe(true);
    expect(limiter.isAllowed("5.6.7.8")).toBe(true);
    expect(limiter.isAllowed("1.2.3.4")).toBe(false);
  });

  it("allows requests again once the window has elapsed", () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(0);
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });

    expect(limiter.isAllowed("1.2.3.4")).toBe(true);
    expect(limiter.isAllowed("1.2.3.4")).toBe(false);

    nowSpy.mockReturnValue(1001);

    expect(limiter.isAllowed("1.2.3.4")).toBe(true);
  });

  it("evicts the oldest key when its bounded fallback store is full", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });

    for (let index = 0; index <= 1_000; index += 1) {
      expect(limiter.isAllowed(`client-${index}`)).toBe(true);
    }

    expect(limiter.isAllowed("client-0")).toBe(true);
  });
});
