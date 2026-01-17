"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smtpConfig_1 = require("../src/notifications/smtpConfig");
describe("smtp config", () => {
    const originalEnv = { ...process.env };
    afterEach(() => {
        process.env = { ...originalEnv };
    });
    it("returns errors when required values missing", () => {
        delete process.env.SMTP_HOST;
        delete process.env.SENDER_EMAIL;
        const result = (0, smtpConfig_1.loadSmtpConfig)();
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain("SMTP_HOST is required");
            expect(result.errors).toContain("SENDER_EMAIL is required");
        }
    });
    it("loads config with defaults", () => {
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        delete process.env.SMTP_PORT;
        delete process.env.SMTP_SECURE;
        const result = (0, smtpConfig_1.loadSmtpConfig)();
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.value.port).toBe(587);
        expect(result.value.secure).toBe(false);
    });
    it("loads config with auth", () => {
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        process.env.SMTP_PORT = "465";
        process.env.SMTP_SECURE = "true";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASSWORD = "pass";
        const result = (0, smtpConfig_1.loadSmtpConfig)();
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.value.port).toBe(465);
        expect(result.value.secure).toBe(true);
        expect(result.value.user).toBe("user");
    });
    it("falls back to default port on invalid value", () => {
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        process.env.SMTP_PORT = "invalid";
        const result = (0, smtpConfig_1.loadSmtpConfig)();
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.value.port).toBe(587);
    });
});
