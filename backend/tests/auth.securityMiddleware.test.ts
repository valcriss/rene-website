import express from "express";
import request from "supertest";
import { createAuthenticationMiddleware, csrfProtection } from "../src/auth/middleware";
import { signUserToken } from "../src/auth/jwt";
import { AuthRepository } from "../src/auth/repository";
import { AuthSession, AuthUserWithPassword } from "../src/auth/types";

const user: AuthUserWithPassword = {
  id: "user-1",
  name: "Writer",
  email: "writer@test",
  role: "EDITOR",
  passwordHash: "hash",
  sessionVersion: 0
};

const session: AuthSession = {
  id: "session-1",
  userId: user.id,
  familyId: "family-1",
  refreshTokenHash: "hash",
  sessionVersion: 0,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null
};

const repoWith = (overrides: Partial<AuthRepository> = {}): AuthRepository => ({
  getUserByEmail: async () => user,
  getUserById: async () => user,
  listUsersByRole: async () => [user],
  createEditorUser: async () => user,
  updatePasswordHash: async () => undefined,
  createPasswordResetToken: async () => undefined,
  getPasswordResetTokenByHash: async () => null,
  deletePasswordResetTokensByUserId: async () => undefined,
  createSession: async () => undefined,
  getSessionById: async () => session,
  getSessionByRefreshTokenHash: async () => session,
  rotateSession: async () => undefined,
  revokeSessionFamily: async () => undefined,
  invalidateUserSessions: async () => undefined,
  ...overrides
});

const accessCookie = (token: string) => `rene_access=${token}`;

const buildApp = (repo: AuthRepository) => {
  const app = express();
  app.use(createAuthenticationMiddleware(repo));
  app.use(csrfProtection);
  app.all("/api/private", (req, res) => res.json({ user: req.user ?? null }));
  app.post("/api/auth/refresh", (_req, res) => res.json({ refresh: true }));
  app.post("/api/auth/logout", (_req, res) => res.json({ logout: true }));
  return app;
};

describe("cookie authentication middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.NODE_ENV = "test";
  });

  it("authenticates a current server-side session and reloads the user", async () => {
    const signed = signUserToken(user, session.id);
    if (!signed.ok) throw new Error("sign failed");
    const response = await request(buildApp(repoWith()))
      .get("/api/private")
      .set("Cookie", accessCookie(signed.value));
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: user.id, role: "EDITOR" });
  });

  it("allows anonymous requests and ignores bearer tokens outside tests", async () => {
    expect((await request(buildApp(repoWith())).get("/api/private")).body.user).toBeNull();
    process.env.NODE_ENV = "production";
    const response = await request(buildApp(repoWith())).get("/api/private").set("Authorization", "Bearer stolen");
    expect(response.status).toBe(200);
    expect(response.body.user).toBeNull();
  });

  it("rejects malformed test bearer credentials", async () => {
    expect((await request(buildApp(repoWith())).get("/api/private").set("Authorization", "Token bad")).status)
      .toBe(401);
    expect((await request(buildApp(repoWith())).get("/api/private").set("Authorization", "Bearer bad")).status)
      .toBe(401);
  });

  it("accepts a valid synthetic bearer only in the test environment", async () => {
    const signed = signUserToken(user);
    if (!signed.ok) throw new Error("sign failed");
    const response = await request(buildApp(repoWith()))
      .get("/api/private")
      .set("Authorization", `Bearer ${signed.value}`);
    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
  });

  it("lets refresh and logout clear an invalid access cookie", async () => {
    const cookie = "rene_access=invalid; rene_csrf=csrf; rene_refresh=refresh";
    expect((await request(buildApp(repoWith())).post("/api/auth/refresh").set("Cookie", cookie).set("X-CSRF-Token", "csrf")).status)
      .toBe(200);
    expect((await request(buildApp(repoWith())).post("/api/auth/logout").set("Cookie", cookie).set("X-CSRF-Token", "csrf")).status)
      .toBe(200);
    expect((await request(buildApp(repoWith())).get("/api/private").set("Cookie", "rene_access=invalid")).status)
      .toBe(401);
  });

  it("rejects access JWTs without server-session claims", async () => {
    const signed = signUserToken(user);
    if (!signed.ok) throw new Error("sign failed");
    expect((await request(buildApp(repoWith())).get("/api/private").set("Cookie", accessCookie(signed.value))).status)
      .toBe(401);
  });

  it.each([
    ["missing session", null, user],
    ["revoked session", { ...session, revokedAt: new Date() }, user],
    ["expired session", { ...session, expiresAt: new Date(0) }, user],
    ["deleted user", session, null],
    ["wrong user", { ...session, userId: "other" }, user],
    ["changed session version", { ...session, sessionVersion: 1 }, user]
  ])("rejects a %s immediately", async (_label, storedSession, storedUser) => {
    const signed = signUserToken(user, session.id);
    if (!signed.ok) throw new Error("sign failed");
    const response = await request(buildApp(repoWith({
      getSessionById: async () => storedSession as AuthSession | null,
      getUserById: async () => storedUser as AuthUserWithPassword | null
    }))).get("/api/private").set("Cookie", accessCookie(signed.value));
    expect(response.status).toBe(401);
  });

  it("rejects when the JWT version differs from the current account", async () => {
    const signed = signUserToken(user, session.id);
    if (!signed.ok) throw new Error("sign failed");
    const current = { ...user, sessionVersion: 1 };
    const response = await request(buildApp(repoWith({
      getSessionById: async () => ({ ...session, sessionVersion: 1 }),
      getUserById: async () => current
    }))).get("/api/private").set("Cookie", accessCookie(signed.value));
    expect(response.status).toBe(401);
  });

  it("enforces double-submit CSRF on authenticated unsafe requests", async () => {
    const cookie = "rene_refresh=refresh; rene_csrf=csrf";
    expect((await request(buildApp(repoWith())).post("/api/private").set("Cookie", cookie)).status).toBe(403);
    expect((await request(buildApp(repoWith())).post("/api/private").set("Cookie", cookie).set("X-CSRF-Token", "stolen")).status)
      .toBe(403);
    expect((await request(buildApp(repoWith())).post("/api/private").set("Cookie", cookie).set("X-CSRF-Token", "csrf")).status)
      .toBe(200);
    expect((await request(buildApp(repoWith())).post("/api/private")).status).toBe(200);
    expect((await request(buildApp(repoWith())).options("/api/private").set("Cookie", cookie)).status).toBe(200);
  });
});
