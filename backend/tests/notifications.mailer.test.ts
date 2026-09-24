jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve())
  }))
}));

import nodemailer from "nodemailer";
import { getSmtpTimeoutMs, sendEmail } from "../src/notifications/mailer";

const transportMock = nodemailer as unknown as { createTransport: jest.Mock };

describe("mailer", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    transportMock.createTransport.mockClear();
  });

  it("short-circuits in test env", async () => {
    process.env.NODE_ENV = "test";

    const result = await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(result.ok).toBe(true);
    expect(transportMock.createTransport).not.toHaveBeenCalled();
  });

  it("returns error when smtp config missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SMTP_HOST;
    delete process.env.SENDER_EMAIL;

    const result = await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(result.ok).toBe(false);
  });

  it("sends email with transporter", async () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_HOST = "smtp.test";
    process.env.SENDER_EMAIL = "noreply@test";

    const result = await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(result.ok).toBe(true);
    expect(transportMock.createTransport).toHaveBeenCalled();
  });

  it("includes auth when credentials provided", async () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_HOST = "smtp.test";
    process.env.SENDER_EMAIL = "noreply@test";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";

    await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(transportMock.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: "user", pass: "pass" } })
    );
  });

  it("bounds SMTP timeouts and applies them to every mail socket phase", async () => {
    delete process.env.SMTP_TIMEOUT_MS;
    expect(getSmtpTimeoutMs()).toBe(10_000);
    process.env.SMTP_TIMEOUT_MS = "invalid";
    expect(getSmtpTimeoutMs()).toBe(10_000);
    process.env.SMTP_TIMEOUT_MS = "1";
    expect(getSmtpTimeoutMs()).toBe(1_000);
    process.env.SMTP_TIMEOUT_MS = "1234.9";
    expect(getSmtpTimeoutMs()).toBe(1_234);
    process.env.SMTP_TIMEOUT_MS = "99999";
    expect(getSmtpTimeoutMs()).toBe(60_000);

    process.env.NODE_ENV = "production";
    process.env.SMTP_HOST = "smtp.test";
    process.env.SENDER_EMAIL = "noreply@test";
    process.env.SMTP_TIMEOUT_MS = "4321";
    await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(transportMock.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      connectionTimeout: 4321,
      greetingTimeout: 4321,
      socketTimeout: 4321
    }));
  });

  it("returns error when sendMail fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_HOST = "smtp.test";
    process.env.SENDER_EMAIL = "noreply@test";

    const sendMail = jest.fn(() => Promise.reject(new Error("boom")));
    transportMock.createTransport.mockReturnValueOnce({ sendMail });

    const result = await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(result.ok).toBe(false);
  });

  it("returns unknown error when sendMail throws non-error", async () => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_HOST = "smtp.test";
    process.env.SENDER_EMAIL = "noreply@test";

    const sendMail = jest.fn(() => Promise.reject("boom"));
    transportMock.createTransport.mockReturnValueOnce({ sendMail });

    const result = await sendEmail({ to: "a@test", subject: "s", text: "t" });

    expect(result.ok).toBe(false);
  });
});
