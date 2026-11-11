import request from "supertest";
import { createApp } from "../src/app";
import { eventsReadRateLimitPolicy } from "../src/events/routes";
import { authHeader } from "./authTestUtils";

// Exercised through the real createApp() wiring (CSRF, auth, general quota, logging all in place)
// so a change to the app composition cannot silently bypass the read quota (issue #133).
describe("authenticated events reads rate limiting", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  const exhaust = async (app: ReturnType<typeof createApp>, path: string, header: string, count: number) => {
    for (let index = 0; index < count; index += 1) {
      const response = await request(app).get(path).set("Authorization", header);
      expect(response.status).not.toBe(429);
    }
  };

  it("keeps the documented per-actor bound below the per-IP bound", () => {
    expect(eventsReadRateLimitPolicy.actor.max).toBeLessThan(eventsReadRateLimitPolicy.ip.max);
  });

  it("returns 429 with Retry-After on GET /api/events once the actor quota is spent", async () => {
    const app = createApp();
    const header = authHeader("EDITOR", "reader-list");

    await exhaust(app, "/api/events", header, eventsReadRateLimitPolicy.actor.max);
    const response = await request(app).get("/api/events").set("Authorization", header);

    expect(response.status).toBe(429);
    expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
    expect(response.body).toEqual({ errors: ["Trop de requêtes. Réessayez plus tard."] });
  });

  it("returns 429 on GET /api/events/:id once the actor quota is spent", async () => {
    const app = createApp();
    const header = authHeader("EDITOR", "reader-detail");

    await exhaust(app, "/api/events/missing", header, eventsReadRateLimitPolicy.actor.max);
    const response = await request(app).get("/api/events/missing").set("Authorization", header);

    expect(response.status).toBe(429);
  });

  it("shares the same quota between the list and detail routes for one actor", async () => {
    const app = createApp();
    const header = authHeader("MODERATOR", "reader-shared");

    await exhaust(app, "/api/events", header, eventsReadRateLimitPolicy.actor.max);
    const response = await request(app).get("/api/events/missing").set("Authorization", header);

    expect(response.status).toBe(429);
  });

  it("does not let one actor exhaust another actor's quota", async () => {
    const app = createApp();
    const noisy = authHeader("EDITOR", "reader-noisy");
    const other = authHeader("EDITOR", "reader-other");

    await exhaust(app, "/api/events", noisy, eventsReadRateLimitPolicy.actor.max);
    expect((await request(app).get("/api/events").set("Authorization", noisy)).status).toBe(429);

    expect((await request(app).get("/api/events").set("Authorization", other)).status).toBe(200);
  });

  it("rejects anonymous reads with 401 without consuming the quota", async () => {
    const app = createApp();

    for (let index = 0; index < eventsReadRateLimitPolicy.actor.max + 1; index += 1) {
      expect((await request(app).get("/api/events")).status).toBe(401);
    }
    const response = await request(app).get("/api/events").set("Authorization", authHeader("EDITOR", "reader-after-anon"));

    expect(response.status).toBe(200);
  });
});
