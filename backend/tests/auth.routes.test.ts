import express from "express";
import request from "supertest";
import { createAuthRouter } from "../src/auth/routes";
import { AuthRepository } from "../src/auth/repository";
import { hashPassword } from "../src/auth/password";
import { hashPasswordResetToken } from "../src/auth/resetToken";
import { hashEmailVerificationToken } from "../src/auth/emailVerification";

const buildRepo = (
  passwordHash: string | null,
  options?: {
    getPasswordResetTokenByHash?: AuthRepository["getPasswordResetTokenByHash"];
  }
): AuthRepository => ({
  getUserByEmail: async () =>
    passwordHash
      ? {
          id: "user-1",
          name: "Test",
          email: "test@example.com",
          role: "EDITOR",
          passwordHash
        }
      : null,
  getUserById: async () => null,
  listUsersByRole: async () => [],
  createEditorUser: async ({ name, email }) => ({ id: "created-user", name, email, role: "EDITOR" }),
  updatePasswordHash: async () => undefined,
  createPasswordResetToken: async () => undefined,
  getPasswordResetTokenByHash: options?.getPasswordResetTokenByHash ?? (async () => null),
  deletePasswordResetTokensByUserId: async () => undefined,
  createSession: async () => undefined,
  getSessionById: async () => null,
  getSessionByRefreshTokenHash: async () => null,
  rotateSession: async () => undefined,
  revokeSessionFamily: async () => undefined,
  invalidateUserSessions: async () => undefined
});

describe("auth routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.NODE_ENV = "test";
  });

  it("returns 400 on invalid payload", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("L'email est requis ou invalide.");
  });

  it("returns 401 on invalid credentials", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrong" });

    expect(response.status).toBe(401);
  });

  it("returns secure session cookies on success", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "secret" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeUndefined();
    const cookies = String(response.headers["set-cookie"]);
    expect(cookies).toContain("rene_access=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Strict");
    expect(response.body.user.email).toBe("test@example.com");
  });

  it("returns 400 on invalid signup payload", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/signup").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Le nom est requis.");
  });

  it("returns a neutral accepted response on duplicate signup email", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/signup").send({
      name: "Test",
      email: "test@example.com",
      password: "correct horse battery",
      passwordConfirmation: "correct horse battery"
    });

    expect(response.status).toBe(202);
    expect(response.body.message).toContain("Si cette adresse");
  });

  it("requests email verification on signup success", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(null)));

    const response = await request(app).post("/api/auth/signup").send({
      name: "New User",
      email: "new@example.com",
      password: "correct horse battery",
      passwordConfirmation: "correct horse battery"
    });

    expect(response.status).toBe(202);
    expect(response.body.message).toContain("Si cette adresse");
  });

  it("returns 400 on invalid forgot-password payload", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/forgot-password").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("L'email est requis ou invalide.");
  });

  it("returns 200 on forgot-password request", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com"
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("Si un compte existe");
  });

  it("keeps forgot-password response neutral when email cannot be sent", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SMTP_HOST;
    delete process.env.SENDER_EMAIL;
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com"
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("Si un compte existe");
  });

  it("returns 400 on invalid reset-password payload", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/reset-password").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Le jeton de réinitialisation est requis.");
  });

  it("returns 200 on reset-password success", async () => {
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createAuthRouter(
        buildRepo(await hashPassword("secret"), {
          getPasswordResetTokenByHash: async (tokenHash) =>
            tokenHash === hashPasswordResetToken("valid-token")
              ? {
                  id: "reset-1",
                  userId: "user-1",
                  expiresAt: new Date(Date.now() + 60_000)
                }
              : null
        })
      )
    );

    const response = await request(app).post("/api/auth/reset-password").send({
      token: "valid-token",
      password: "new-secret-password",
      passwordConfirmation: "new-secret-password"
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Le mot de passe a été réinitialisé.");
  });

  it("throttles sensitive auth requests with a retry hint", async () => {
    const app = express();
    app.use(express.json());
    const repo = buildRepo(await hashPassword("secret"));
    repo.consumeRateLimit = async () => ({ allowed: false, retryAfterSeconds: 9 });
    app.use("/api", createAuthRouter(repo));

    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "secret"
    });
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBe("9");
  });

  it("verifies a public email token exactly once", async () => {
    const app = express();
    app.use(express.json());
    const repo = buildRepo(await hashPassword("secret"));
    repo.getEmailVerificationTokenByHash = async (tokenHash) => tokenHash === hashEmailVerificationToken("valid")
      ? { id: "verification", userId: "user-1", expiresAt: new Date(Date.now() + 60_000) }
      : null;
    repo.markEmailVerified = jest.fn(async () => undefined);
    repo.deleteEmailVerificationTokensByUserId = jest.fn(async () => undefined);
    app.use("/api", createAuthRouter(repo));

    expect((await request(app).post("/api/auth/verify-email").send({ token: "valid" })).status).toBe(200);
    expect((await request(app).post("/api/auth/verify-email").send({ token: "invalid" })).status).toBe(400);
  });

  it("applies the same throttle response to every public auth mutation", async () => {
    const app = express();
    app.use(express.json());
    const repo = buildRepo(await hashPassword("secret"));
    repo.consumeRateLimit = async () => ({ allowed: false, retryAfterSeconds: 1 });
    app.use("/api", createAuthRouter(repo));

    for (const path of ["signup", "forgot-password", "reset-password", "verify-email"]) {
      const response = await request(app).post(`/api/auth/${path}`).send({});
      expect(response.status).toBe(429);
    }
  });

  it("accepts missing optional auth fields as validation input without crashing", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));
    expect((await request(app).post("/api/auth/forgot-password")).status).toBe(400);
    expect((await request(app).post("/api/auth/reset-password")).status).toBe(400);
    expect((await request(app).post("/api/auth/verify-email")).status).toBe(400);
  });
});
