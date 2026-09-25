import express from "express";
import request from "supertest";
import { requestLogging, safeErrorMessage } from "../src/security/logging";

describe("security logging", () => {
  afterEach(() => jest.restoreAllMocks());

  it("writes a structured normalized request record with a pseudonymous actor", async () => {
    const log = jest.spyOn(console, "log").mockImplementation();
    const app = express();
    app.use((req, _res, next) => { req.user = { id: "actor-1", name: "Actor", email: "actor@test", role: "ADMIN" }; next(); });
    app.use(requestLogging);
    app.get("/events/:id", (_req, res) => res.status(201).json({ ok: true }));

    const response = await request(app).get("/events/secret-id?token=secret");
    const entry = JSON.parse(log.mock.calls[0][0]);

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(entry).toEqual(expect.objectContaining({
      event: "http_request",
      method: "GET",
      route: "/events/:id",
      status: 201,
      actor: expect.stringMatching(/^[a-f0-9]{16}$/)
    }));
    expect(entry).not.toHaveProperty("query");
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining("secret"));
  });

  it("does not identify an anonymous actor or preserve an un-routed query string", async () => {
    const log = jest.spyOn(console, "log").mockImplementation();
    const app = express();
    app.use(requestLogging);
    app.use((_req, res) => res.status(404).end());

    await request(app).get("/missing?email=visitor@example.test");
    const entry = JSON.parse(log.mock.calls[0][0]);

    expect(entry.route).toBe("/missing");
    expect(entry.actor).toBeUndefined();
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining("visitor@example.test"));
  });

  it("redacts error detail to its type", () => {
    expect(safeErrorMessage(new Error("smtp-password=secret"))).toBe("Error");
    expect(safeErrorMessage("token=secret")).toBe("UnknownError");
  });
});
