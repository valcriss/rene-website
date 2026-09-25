const registerStaticMock = jest.fn();

jest.mock("../src/static", () => ({
  registerStatic: registerStaticMock
}));

const enforceRequestRateLimitMock = jest.fn(async (_limiter: unknown, _req: unknown, res: import("express").Response) => {
  res.status(429).json({ errors: ["Trop de requêtes. Réessayez plus tard."] });
  return false;
});

jest.mock("../src/security/rateLimiter", () => ({
  ...jest.requireActual("../src/security/rateLimiter"),
  enforceRequestRateLimit: enforceRequestRateLimitMock
}));

import request from "supertest";
import { createApp } from "../src/app";

describe("createApp", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    registerStaticMock.mockClear();
  });

  it("does not register static in the test environment", () => {
    process.env.NODE_ENV = "test";
    createApp();
    expect(registerStaticMock).not.toHaveBeenCalled();
  });

  it("registers static in development (so SSR is exercised outside production too)", () => {
    process.env.NODE_ENV = "development";
    createApp();
    expect(registerStaticMock).toHaveBeenCalled();
  });

  it("registers static in production", () => {
    process.env.NODE_ENV = "production";
    createApp();
    expect(registerStaticMock).toHaveBeenCalled();
  });
});

describe("createApp API mutation rate limiting", () => {
  afterEach(() => {
    enforceRequestRateLimitMock.mockClear();
  });

  it("stops the request at the rate limiter and never reaches the route when the limit is exceeded", async () => {
    const app = createApp();

    const response = await request(app).post("/api/events").send({});

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ errors: ["Trop de requêtes. Réessayez plus tard."] });
    expect(enforceRequestRateLimitMock).toHaveBeenCalled();
  });
});
