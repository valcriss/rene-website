import express from "express";
import request from "supertest";
import { AdminRepository } from "../src/admin/repository";

jest.mock("../src/notifications/service", () => ({
  notifyContactMessage: jest.fn(async () => ({ ok: false, errors: ["SMTP_HOST is required"] }))
}));

import { createContactRouter } from "../src/contact/routes";

describe("contact routes notification failure", () => {
  it("returns 502 when the notification fails to send", async () => {
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

    const response = await request(app)
      .post("/api/contact")
      .send({ name: "Marie", email: "marie@test.fr", message: "Bonjour" });

    expect(response.status).toBe(502);
    expect(response.body.errors).toContain("SMTP_HOST is required");
  });
});
