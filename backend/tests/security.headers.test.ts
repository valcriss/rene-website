import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import {
  enforceHttps,
  getContentSecurityPolicy,
  preventPrivateCaching,
  securityHeaders
} from "../src/security/headers";

const createSecurityApp = (withUser = false) => {
  const app = express();
  if (withUser) app.use((req, _res, next) => { req.user = { id: "user", name: "User", email: "user@test", role: "EDITOR" }; next(); });
  app.use(enforceHttps);
  app.use(securityHeaders);
  app.use(preventPrivateCaching);
  app.get("/error", (_req, res) => res.status(500).json({ error: true }));
  app.get("/{*splat}", (_req, res) => res.json({ ok: true }));
  return app;
};

describe("security response headers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("disables Express disclosure and applies blocking headers to API responses and errors", async () => {
    process.env.NODE_ENV = "test";
    const response = await request(createApp()).get("/api/health");
    const errorResponse = await request(createSecurityApp()).get("/error");

    expect(response.status).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(response.headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(response.headers["content-security-policy"]).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers["permissions-policy"]).toContain("geolocation=()");
    expect(errorResponse.status).toBe(500);
    expect(errorResponse.headers["content-security-policy"]).toBe(getContentSecurityPolicy());
  });

  it("uses report-only CSP only when explicitly requested", async () => {
    process.env.CSP_REPORT_ONLY = "true";
    const response = await request(createSecurityApp()).get("/public");

    expect(response.headers["content-security-policy"]).toBeUndefined();
    expect(response.headers["content-security-policy-report-only"]).toBe(getContentSecurityPolicy());
  });

  it("sets HSTS only on a production HTTPS request", async () => {
    process.env.NODE_ENV = "production";
    const app = createSecurityApp();
    app.set("trust proxy", 1);

    const secure = await request(app).get("/public").set("X-Forwarded-Proto", "https");
    const insecure = await request(app).get("/public");

    expect(secure.headers["strict-transport-security"]).toBe("max-age=86400");
    expect(insecure.headers["strict-transport-security"]).toBeUndefined();
  });

  it.each(["/api/auth/login", "/api/admin/users", "/api/subscriptions/categories", "/backoffice", "/backoffice/events"])(
    "does not cache sensitive path %s",
    async (path) => {
      const response = await request(createSecurityApp()).get(path);

      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers.pragma).toBe("no-cache");
    }
  );

  it("does not cache an authenticated response while public assets remain cacheable", async () => {
    const privateResponse = await request(createSecurityApp(true)).get("/public");
    const publicResponse = await request(createSecurityApp()).get("/public");

    expect(privateResponse.headers["cache-control"]).toBe("no-store");
    expect(publicResponse.headers["cache-control"]).toBeUndefined();
  });

  it("redirects only configured production HTTP traffic to the configured HTTPS origin", async () => {
    process.env.NODE_ENV = "development";
    process.env.FORCE_HTTPS = "true";
    process.env.SITE_URL = "https://rene.example.test";
    expect((await request(createSecurityApp()).get("/public")).status).toBe(200);

    process.env.NODE_ENV = "production";
    process.env.FORCE_HTTPS = "false";
    expect((await request(createSecurityApp()).get("/public")).status).toBe(200);

    process.env.FORCE_HTTPS = "true";
    delete process.env.SITE_URL;
    expect((await request(createSecurityApp()).get("/public")).status).toBe(200);
    process.env.SITE_URL = "http://rene.example.test";
    expect((await request(createSecurityApp()).get("/public")).status).toBe(200);
    process.env.SITE_URL = "invalid";
    expect((await request(createSecurityApp()).get("/public")).status).toBe(200);
    process.env.SITE_URL = "https://rene.example.test/path";
    const redirect = await request(createSecurityApp()).get("/public?source=http");

    expect(redirect.status).toBe(308);
    expect(redirect.headers.location).toBe("https://rene.example.test/public?source=http");
  });

  it("does not redirect a secure production request", async () => {
    process.env.NODE_ENV = "production";
    process.env.FORCE_HTTPS = "true";
    process.env.SITE_URL = "https://rene.example.test";
    const app = createSecurityApp();
    app.set("trust proxy", 1);

    expect((await request(app).get("/public").set("X-Forwarded-Proto", "https")).status).toBe(200);
  });
});
