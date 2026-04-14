import express from "express";
import request from "supertest";
import { createAuthRouter } from "../src/auth/routes";
import { AuthRepository } from "../src/auth/repository";
import { hashPassword } from "../src/auth/password";

const buildRepo = (passwordHash: string | null): AuthRepository => ({
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
  updatePasswordHash: async () => undefined
});

describe("auth routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
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
});
