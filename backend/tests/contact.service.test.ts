jest.mock("../src/notifications/service", () => ({
  notifyContactMessage: jest.fn(async () => ({ ok: true }))
}));

import { notifyContactMessage } from "../src/notifications/service";
import { submitContactMessage } from "../src/contact/service";
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
    const result = await submitContactMessage(adminRepo, { name: "Marie", email: "marie@test.fr", message: "Bonjour" });

    expect(result.ok).toBe(true);
    expect(notifyContactMessageMock).toHaveBeenCalledWith("contact@rene-website.test", {
      name: "Marie",
      email: "marie@test.fr",
      message: "Bonjour"
    });
  });

  it("returns validation errors without sending anything", async () => {
    const result = await submitContactMessage(adminRepo, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
    }
    expect(notifyContactMessageMock).not.toHaveBeenCalled();
  });

  it("silently drops messages with a filled honeypot field", async () => {
    const result = await submitContactMessage(adminRepo, {
      name: "Bot", email: "bot@test.fr", message: "Spam", website: "https://spam.example.com"
    });

    expect(result.ok).toBe(true);
    expect(notifyContactMessageMock).not.toHaveBeenCalled();
  });

  it("returns a notification error when sending fails", async () => {
    notifyContactMessageMock.mockResolvedValueOnce({ ok: false, errors: ["SMTP_HOST is required"] });
    const result = await submitContactMessage(adminRepo, { name: "Marie", email: "marie@test.fr", message: "Bonjour" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("notification");
      expect(result.errors).toContain("SMTP_HOST is required");
    }
  });
});
