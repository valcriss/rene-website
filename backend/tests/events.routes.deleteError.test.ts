import express from "express";
import request from "supertest";
import { EventRepository } from "../src/events/repository";
import { AuthRepository } from "../src/auth/repository";

jest.mock("../src/events/service", () => {
  const actual = jest.requireActual("../src/events/service");
  return {
    ...actual,
    deleteEvent: jest.fn(async () => ({ ok: false, errors: ["Autre erreur"] }))
  };
});

import { createEventRouter } from "../src/events/routes";

describe("events routes delete errors", () => {
  const authRepo: AuthRepository = {
    getUserByEmail: async () => null,
    getUserById: async () => null,
    listUsersByRole: async () => []
  };

  it("returns 400 for delete errors", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => null,
      create: async () => {
        throw new Error("boom");
      },
      update: async () => null,
      delete: async () => false,
      updateStatus: async () => null
    };
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(repo, authRepo));

    const response = await request(app)
      .delete("/api/events/whatever")
      .set("x-user-role", "EDITOR");

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Autre erreur");
  });
});
