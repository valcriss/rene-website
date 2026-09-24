jest.mock("../src/moderationReminders/service", () => ({
  runModerationReminderCheck: jest.fn(async () => ({ remindersSent: 2 }))
}));

import express from "express";
import request from "supertest";
import { createModerationReminderRouter } from "../src/moderationReminders/routes";
import { runModerationReminderCheck } from "../src/moderationReminders/service";

const runModerationReminderCheckMock = runModerationReminderCheck as jest.Mock;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api", createModerationReminderRouter({} as never, {} as never, {} as never));
  return app;
};

describe("moderation reminders routes", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    runModerationReminderCheckMock.mockClear();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const app = buildApp();

    const response = await request(app).post("/api/moderation-reminders/check").set("x-cron-secret", "anything");

    expect(response.status).toBe(500);
    expect(runModerationReminderCheckMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the provided secret does not match", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const app = buildApp();

    const response = await request(app).post("/api/moderation-reminders/check").set("x-cron-secret", "wrong-secret");

    expect(response.status).toBe(401);
    expect(runModerationReminderCheckMock).not.toHaveBeenCalled();
  });

  it("returns 401 when no secret is provided", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const app = buildApp();

    const response = await request(app).post("/api/moderation-reminders/check");

    expect(response.status).toBe(401);
  });

  it("runs the check and returns the result when the secret matches", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const app = buildApp();

    const response = await request(app).post("/api/moderation-reminders/check").set("x-cron-secret", "expected-secret");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ remindersSent: 2 });
    expect(runModerationReminderCheckMock).toHaveBeenCalled();
  });

  it("returns 500 when the handler throws", async () => {
    process.env.CRON_SECRET = "expected-secret";
    runModerationReminderCheckMock.mockRejectedValueOnce(new Error("boom"));
    const app = buildApp();

    const response = await request(app).post("/api/moderation-reminders/check").set("x-cron-secret", "expected-secret");

    expect(response.status).toBe(500);
  });
});
