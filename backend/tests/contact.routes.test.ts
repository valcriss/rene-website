import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createContactRouter } from "../src/contact/routes";
import { AdminRepository } from "../src/admin/repository";

describe("contact routes", () => {
  it("sends a valid contact message", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/contact")
      .send({ name: "Marie", email: "marie@test.fr", message: "Bonjour, une question." });

    expect(response.status).toBe(200);
    expect(response.body.message).toBeTruthy();
  });

  it("returns 400 for an invalid payload", async () => {
    const app = createApp();

    const response = await request(app).post("/api/contact").send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Le nom est requis.");
  });

  it("silently accepts messages caught by the honeypot", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/contact")
      .send({ name: "Bot", email: "bot@test.fr", message: "Spam", website: "https://spam.example.com" });

    expect(response.status).toBe(200);
  });

  it("returns 429 once the rate limit is exceeded", async () => {
    const app = express();
    app.use(express.json());
    const adminRepo = {
      getSettings: async () => ({
        contactEmail: "contact@rene-website.test",
        contactPhone: "0102030405",
        homepageIntro: "Intro",
        homepageSubtitle: ""
      })
    } as unknown as AdminRepository;
    app.use("/api", createContactRouter(adminRepo));
    const payload = { name: "Marie", email: "marie@test.fr", message: "Bonjour" };

    for (let i = 0; i < 5; i += 1) {
      const okResponse = await request(app).post("/api/contact").send(payload);
      expect(okResponse.status).toBe(200);
    }
    const response = await request(app).post("/api/contact").send(payload);

    expect(response.status).toBe(429);
  });

  it("returns 500 when the handler throws", async () => {
    const app = express();
    app.use(express.json());
    const adminRepo = {
      getSettings: async () => {
        throw new Error("boom");
      }
    } as unknown as AdminRepository;
    app.use("/api", createContactRouter(adminRepo));

    const response = await request(app)
      .post("/api/contact")
      .send({ name: "Marie", email: "marie@test.fr", message: "Bonjour" });

    expect(response.status).toBe(500);
  });
});
