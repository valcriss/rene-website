"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("nodemailer", () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn(() => Promise.resolve())
    }))
}));
const nodemailer_1 = __importDefault(require("nodemailer"));
const mailer_1 = require("../src/notifications/mailer");
const transportMock = nodemailer_1.default;
describe("mailer", () => {
    const originalEnv = { ...process.env };
    afterEach(() => {
        process.env = { ...originalEnv };
        transportMock.createTransport.mockClear();
    });
    it("short-circuits in test env", async () => {
        process.env.NODE_ENV = "test";
        const result = await (0, mailer_1.sendEmail)({ to: "a@test", subject: "s", text: "t" });
        expect(result.ok).toBe(true);
        expect(transportMock.createTransport).not.toHaveBeenCalled();
    });
    it("returns error when smtp config missing", async () => {
        process.env.NODE_ENV = "production";
        delete process.env.SMTP_HOST;
        delete process.env.SENDER_EMAIL;
        const result = await (0, mailer_1.sendEmail)({ to: "a@test", subject: "s", text: "t" });
        expect(result.ok).toBe(false);
    });
    it("sends email with transporter", async () => {
        process.env.NODE_ENV = "production";
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        const result = await (0, mailer_1.sendEmail)({ to: "a@test", subject: "s", text: "t" });
        expect(result.ok).toBe(true);
        expect(transportMock.createTransport).toHaveBeenCalled();
    });
    it("includes auth when credentials provided", async () => {
        process.env.NODE_ENV = "production";
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        process.env.SMTP_USER = "user";
        process.env.SMTP_PASSWORD = "pass";
        await (0, mailer_1.sendEmail)({ to: "a@test", subject: "s", text: "t" });
        expect(transportMock.createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: { user: "user", pass: "pass" } }));
    });
    it("returns error when sendMail fails", async () => {
        process.env.NODE_ENV = "production";
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        const sendMail = jest.fn(() => Promise.reject(new Error("boom")));
        transportMock.createTransport.mockReturnValueOnce({ sendMail });
        const result = await (0, mailer_1.sendEmail)({ to: "a@test", subject: "s", text: "t" });
        expect(result.ok).toBe(false);
    });
    it("returns unknown error when sendMail throws non-error", async () => {
        process.env.NODE_ENV = "production";
        process.env.SMTP_HOST = "smtp.test";
        process.env.SENDER_EMAIL = "noreply@test";
        const sendMail = jest.fn(() => Promise.reject("boom"));
        transportMock.createTransport.mockReturnValueOnce({ sendMail });
        const result = await (0, mailer_1.sendEmail)({ to: "a@test", subject: "s", text: "t" });
        expect(result.ok).toBe(false);
    });
});
