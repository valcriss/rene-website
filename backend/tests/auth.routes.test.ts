import express from "express";
import request from "supertest";
import { createAuthRouter } from "../src/auth/routes";
import { AuthRepository } from "../src/auth/repository";
import { hashPassword } from "../src/auth/password";
import { hashPasswordResetToken } from "../src/auth/resetToken";

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
  deletePasswordResetTokensByUserId: async () => undefined
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
    expect(response.body.errors).toContain("L'email est requis.");
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

  it("returns token on success", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "secret" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
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

  it("returns 409 on duplicate signup email", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/signup").send({
      name: "Test",
      email: "test@example.com",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(response.status).toBe(409);
    expect(response.body.errors).toContain("Un compte existe déjà avec cet email.");
  });

  it("returns session payload on signup success", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(null)));

    const response = await request(app).post("/api/auth/signup").send({
      name: "New User",
      email: "new@example.com",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe("EDITOR");
  });

  it("returns 400 on invalid forgot-password payload", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/forgot-password").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("L'email est requis.");
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

  it("returns 500 when forgot-password email cannot be sent", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SMTP_HOST;
    delete process.env.SENDER_EMAIL;
    const app = express();
    app.use(express.json());
    app.use("/api", createAuthRouter(buildRepo(await hashPassword("secret"))));

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com"
    });

    expect(response.status).toBe(500);
    expect(response.body.errors).toContain("SMTP_HOST is required");
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
      password: "new-secret-123",
      passwordConfirmation: "new-secret-123"
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Le mot de passe a été réinitialisé.");
  });
});
