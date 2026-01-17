import express from "express";
import request from "supertest";
import { authenticateOptional } from "../src/auth/middleware";
import { signUserToken } from "../src/auth/jwt";

describe("auth middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("allows unauthenticated requests", async () => {
    const app = express();
    app.use(authenticateOptional);
    app.get("/me", (req, res) => {
      res.json({ user: req.user ?? null });
    });

    const response = await request(app).get("/me");

    expect(response.status).toBe(200);
    expect(response.body.user).toBeNull();
  });

  it("attaches user when token is valid", async () => {
    const tokenResult = signUserToken({
      id: "user-1",
      name: "Test",
      email: "test@example.com",
      role: "EDITOR"
    });
    if (!tokenResult.ok) throw new Error("Token generation failed");

    const app = express();
    app.use(authenticateOptional);
    app.get("/me", (req, res) => {
      res.json({ user: req.user ?? null });
    });

    const response = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${tokenResult.value}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("test@example.com");
  });

  it("rejects invalid token", async () => {
    const app = express();
    app.use(authenticateOptional);
    app.get("/me", (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app)
      .get("/me")
      .set("Authorization", "Bearer invalid");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authentication required" });
  });

  it("rejects invalid authorization scheme", async () => {
    const app = express();
    app.use(authenticateOptional);
    app.get("/me", (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app)
      .get("/me")
      .set("Authorization", "Token abc");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authentication required" });
  });
});
