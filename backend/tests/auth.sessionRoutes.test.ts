import express from "express";
import request from "supertest";
import { createAuthRouter } from "../src/auth/routes";
import { createAuthenticationMiddleware, csrfProtection } from "../src/auth/middleware";
import { createInMemoryAuthRepository } from "../src/auth/inMemoryRepository";
import { hashPassword } from "../src/auth/password";

const cookieLines = (response: request.Response) => {
  const value = response.headers["set-cookie"] as unknown;
  return Array.isArray(value) ? value as string[] : [String(value)];
};

const cookieValue = (response: request.Response, name: string) => {
  const line = cookieLines(response).find((item) => item.startsWith(`${name}=`));
  return line?.split(";", 1)[0].slice(name.length + 1) ?? "";
};

const buildApp = (repo = createInMemoryAuthRepository()) => {
  const app = express();
  app.use(express.json());
  app.use(createAuthenticationMiddleware(repo));
  app.use(csrfProtection);
  app.use("/api", createAuthRouter(repo));
  return { app, repo };
};

const seedUser = async (repo: ReturnType<typeof createInMemoryAuthRepository>) => {
  await repo.createEditorUser({
    name: "Writer",
    email: "writer@test.fr",
    passwordHash: await hashPassword("secret123")
  });
};

describe("auth session routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.NODE_ENV = "test";
  });

  it("creates minimally scoped cookies and exposes no token in JSON", async () => {
    const { app, repo } = buildApp();
    await seedUser(repo);
    const response = await request(app).post("/api/auth/login").send({
      email: "writer@test.fr",
      password: "secret123"
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: { id: expect.any(String), name: "Writer", email: "writer@test.fr", role: "EDITOR" }
    });
    const cookies = cookieLines(response).join("\n");
    expect(cookies).toContain("rene_access=");
    expect(cookieLines(response).find((cookie) => cookie.startsWith("rene_access="))).toMatch(/Path=\/api;.*HttpOnly; SameSite=Strict/);
    expect(cookies).toContain("rene_refresh=");
    expect(cookieLines(response).find((cookie) => cookie.startsWith("rene_refresh="))).toMatch(/Path=\/api\/auth;.*HttpOnly; SameSite=Strict/);
    expect(cookies).toContain("rene_csrf=");
    expect(cookies).not.toMatch(/rene_csrf=.*HttpOnly/);
  });

  it("marks all cookies Secure in production", async () => {
    process.env.NODE_ENV = "production";
    const { app, repo } = buildApp();
    await seedUser(repo);
    const response = await request(app).post("/api/auth/login").send({
      email: "writer@test.fr",
      password: "secret123"
    });
    expect(cookieLines(response).every((cookie) => cookie.includes("Secure"))).toBe(true);
  });

  it("returns a configuration error without creating a login or signup session", async () => {
    delete process.env.JWT_SECRET;
    const loginSetup = buildApp();
    await seedUser(loginSetup.repo);
    expect((await request(loginSetup.app).post("/api/auth/login").send({
      email: "writer@test.fr",
      password: "secret123"
    })).status).toBe(500);

    const signupSetup = buildApp();
    expect((await request(signupSetup.app).post("/api/auth/signup").send({
      name: "New",
      email: "new@test.fr",
      password: "secret123",
      passwordConfirmation: "secret123"
    })).status).toBe(500);
  });

  it("restores, rotates and logs out a session server-side", async () => {
    const { app, repo } = buildApp();
    await seedUser(repo);
    expect((await request(app).get("/api/auth/session")).status).toBe(401);

    const login = await request(app).post("/api/auth/login").send({
      email: "writer@test.fr",
      password: "secret123"
    });
    const access = cookieValue(login, "rene_access");
    const refresh = cookieValue(login, "rene_refresh");
    const csrf = cookieValue(login, "rene_csrf");
    const allCookies = `rene_access=${access}; rene_refresh=${refresh}; rene_csrf=${csrf}`;

    const restored = await request(app).get("/api/auth/session").set("Cookie", allCookies);
    expect(restored.status).toBe(200);
    expect(restored.body.user.email).toBe("writer@test.fr");

    expect((await request(app).post("/api/auth/refresh")).status).toBe(401);
    expect((await request(app).post("/api/auth/refresh").set("Cookie", `rene_refresh=missing; rene_csrf=${csrf}`).set("X-CSRF-Token", csrf)).status)
      .toBe(401);
    expect((await request(app).post("/api/auth/refresh").set("Cookie", `rene_refresh=${refresh}`)).status).toBe(403);

    const rotated = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", allCookies)
      .set("X-CSRF-Token", csrf);
    expect(rotated.status).toBe(200);
    expect(cookieValue(rotated, "rene_refresh")).not.toBe(refresh);

    const replay = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `rene_refresh=${refresh}; rene_csrf=${csrf}`)
      .set("X-CSRF-Token", csrf);
    expect(replay.status).toBe(401);

    const newRefresh = cookieValue(rotated, "rene_refresh");
    const newCsrf = cookieValue(rotated, "rene_csrf");
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `rene_refresh=${newRefresh}; rene_csrf=${newCsrf}`)
      .set("X-CSRF-Token", newCsrf);
    expect(logout.status).toBe(204);
    expect(cookieLines(logout).every((cookie) => cookie.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
    expect((await request(app).post("/api/auth/logout")).status).toBe(204);
  });
});
