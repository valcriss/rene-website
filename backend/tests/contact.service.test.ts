jest.mock("../src/notifications/service", () => ({
  notifyContactMessage: jest.fn(async () => ({ ok: true }))
}));

import { notifyContactMessage } from "../src/notifications/service";
import { submitContactMessage } from "../src/contact/service";
import { createRateLimiter } from "../src/contact/rateLimiter";
import { AdminRepository } from "../src/admin/repository";

const notifyContactMessageMock = notifyContactMessage as jest.Mock;

const adminRepo = {
  getSettings: async () => ({
    contactEmail: "contact@rene-website.test",
    contactPhone: "0102030405",
    homepageIntro: "Intro",
    homepageSubtitle: ""
  })
} as unknown as AdminRepository;

describe("submitContactMessage", () => {
  beforeEach(() => {
    notifyContactMessageMock.mockClear();
    notifyContactMessageMock.mockResolvedValue({ ok: true });
  });

  it("sends the message to the configured contact email", async () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 1000 });

    const result = await submitContactMessage(
      adminRepo,
      { name: "Marie", email: "marie@test.fr", message: "Bonjour" },
      limiter,
      "1.2.3.4"
    );

    expect(result.ok).toBe(true);
    expect(notifyContactMessageMock).toHaveBeenCalledWith("contact@rene-website.test", {
      name: "Marie",
      email: "marie@test.fr",
      message: "Bonjour"
    });
  });

  it("returns validation errors without sending anything", async () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 1000 });

    const result = await submitContactMessage(adminRepo, {}, limiter, "1.2.3.4");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
    }
    expect(notifyContactMessageMock).not.toHaveBeenCalled();
  });

  it("silently drops messages with a filled honeypot field", async () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 1000 });

    const result = await submitContactMessage(
      adminRepo,
      { name: "Bot", email: "bot@test.fr", message: "Spam", website: "https://spam.example.com" },
      limiter,
      "1.2.3.4"
    );

    expect(result.ok).toBe(true);
    expect(notifyContactMessageMock).not.toHaveBeenCalled();
  });

  it("rejects when the rate limit is exceeded", async () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    const payload = { name: "Marie", email: "marie@test.fr", message: "Bonjour" };

    await submitContactMessage(adminRepo, payload, limiter, "1.2.3.4");
    const result = await submitContactMessage(adminRepo, payload, limiter, "1.2.3.4");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("rate_limited");
    }
    expect(notifyContactMessageMock).toHaveBeenCalledTimes(1);
  });

  it("returns a notification error when sending fails", async () => {
    notifyContactMessageMock.mockResolvedValueOnce({ ok: false, errors: ["SMTP_HOST is required"] });
    const limiter = createRateLimiter({ max: 5, windowMs: 1000 });

    const result = await submitContactMessage(
      adminRepo,
      { name: "Marie", email: "marie@test.fr", message: "Bonjour" },
      limiter,
      "1.2.3.4"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("notification");
      expect(result.errors).toContain("SMTP_HOST is required");
    }
  });
});
