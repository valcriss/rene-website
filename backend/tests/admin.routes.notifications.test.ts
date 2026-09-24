import express from "express";
import request from "supertest";
import { AdminRepository } from "../src/admin/repository";
import { AuthRepository } from "../src/auth/repository";
import { authenticateOptional } from "../src/auth/middleware";
import { authHeader } from "./authTestUtils";

jest.mock("../src/notifications/service", () => ({
  notifyUserInvited: jest.fn(async () => ({ ok: false, errors: ["boom"] }))
}));

import { createAdminRouter } from "../src/admin/routes";

const notificationMocks = jest.requireMock("../src/notifications/service") as {
  notifyUserInvited: jest.Mock;
};

describe("admin routes invitation warnings", () => {
  it("logs a warning but still creates the user when the invitation email fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const repo = {
      createUser: jest.fn(async (input) => ({
        id: "user-1",
        name: input.name,
        email: input.email,
        role: input.role,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }))
    } as unknown as AdminRepository;
    const authRepo = {
      createPasswordResetToken: jest.fn(async () => undefined)
    } as unknown as AuthRepository;

    const app = express();
    app.use(express.json());
    app.use(authenticateOptional);
    app.use("/api/admin", createAdminRouter(repo, authRepo));

    const response = await request(app)
      .post("/api/admin/users")
      .set("Authorization", authHeader("ADMIN"))
      .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });

    expect(response.status).toBe(201);
    expect(authRepo.createPasswordResetToken).toHaveBeenCalledWith("user-1", expect.any(String), expect.any(Date));
    expect(notificationMocks.notifyUserInvited).toHaveBeenCalledWith(
      "marie@example.com",
      "Marie",
      expect.any(String),
      expect.any(Number)
    );
    expect(warnSpy).toHaveBeenCalledWith("Notifications invite failed", ["boom"]);

    warnSpy.mockRestore();
  });
});
