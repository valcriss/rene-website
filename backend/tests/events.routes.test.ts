import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createEventRouter } from "../src/events/routes";
import { EventRepository } from "../src/events/repository";
import { AuthRepository } from "../src/auth/repository";
import { signUserToken } from "../src/auth/jwt";

const validPayload = {
  title: "Concert",
  content: "Soirée jazz",
  image: "https://example.com/image.jpg",
  categoryId: "music",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle des fêtes",
  address: "1 rue du centre",
  postalCode: "37160",
  city: "Descartes",
  organizerName: "Association"
};

describe("events routes", () => {
  const authRepo: AuthRepository = {
    getUserByEmail: async () => null,
    getUserById: async () => null,
    listUsersByRole: async () => []
  };
  const originalEnv = process.env.NODE_ENV;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        features: [{ geometry: { coordinates: [0.7, 46.97] } }]
      })
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    fetchMock.mockReset();
  });

  it("lists events", async () => {
    const app = createApp();
    const response = await request(app).get("/api/events");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 500 and logs when list fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const repo: EventRepository = {
      list: async () => {
        throw new Error("boom");
      },
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

    const response = await request(app).get("/api/events");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("returns 404 for missing event", async () => {
    const app = createApp();
    const response = await request(app).get("/api/events/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Événement introuvable." });
  });

  it("creates and fetches event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toBeDefined();
    expect(createResponse.body.status).toBe("DRAFT");

    const listResponse = await request(app).get("/api/events");
    expect(listResponse.body).toHaveLength(1);

    const getResponse = await request(app).get(`/api/events/${createResponse.body.id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(createResponse.body.id);
  });

  it("stores creator from auth token", async () => {
    process.env.JWT_SECRET = "test-secret";
    const tokenResult = signUserToken({
      id: "user-1",
      name: "User",
      email: "user@test",
      role: "EDITOR"
    });
    if (!tokenResult.ok) throw new Error("Token generation failed");

    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${tokenResult.value}`)
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.createdByUserId).toBe("user-1");
  });

  it("stores creator from x-user-id header", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .set("x-user-id", "header-user")
      .send(validPayload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.createdByUserId).toBe("header-user");
  });

  it("updates event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    const updatePayload = { ...validPayload, title: "Concert mis à jour" };
    const updateResponse = await request(app)
      .put(`/api/events/${createResponse.body.id}`)
      .set("x-user-role", "EDITOR")
      .send(updatePayload);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.title).toBe("Concert mis à jour");
  });

  it("returns 404 for update missing event", async () => {
    const app = createApp();
    const response = await request(app)
      .put("/api/events/missing")
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    expect(response.status).toBe(404);
  });

  it("returns 400 for update validation errors", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    const response = await request(app)
      .put(`/api/events/${createResponse.body.id}`)
      .set("x-user-role", "EDITOR")
      .send({});

    expect(response.status).toBe(400);
  });

  it("submits publishes and rejects event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);
    const id = createResponse.body.id;

    const submitResponse = await request(app)
      .post(`/api/events/${id}/submit`)
      .set("x-user-role", "EDITOR");
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.status).toBe("PENDING");

    const publishResponse = await request(app)
      .post(`/api/events/${id}/publish`)
      .set("x-user-role", "MODERATOR");
    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.status).toBe("PUBLISHED");

    const rejectResponse = await request(app)
      .post(`/api/events/${id}/reject`)
      .set("x-user-role", "MODERATOR")
      .send({ rejectionReason: "Motif" });
    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.status).toBe("REJECTED");
  });

  it("deletes event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    const deleteResponse = await request(app)
      .delete(`/api/events/${createResponse.body.id}`)
      .set("x-user-role", "EDITOR");

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ id: createResponse.body.id });
  });

  it("returns 404 when delete missing", async () => {
    const app = createApp();
    const response = await request(app)
      .delete("/api/events/missing")
      .set("x-user-role", "EDITOR");

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Événement introuvable.");
  });

  it("returns 404 for submit/publish missing event", async () => {
    const app = createApp();
    const submitResponse = await request(app)
      .post("/api/events/missing/submit")
      .set("x-user-role", "EDITOR");
    const publishResponse = await request(app)
      .post("/api/events/missing/publish")
      .set("x-user-role", "MODERATOR");

    expect(submitResponse.status).toBe(404);
    expect(publishResponse.status).toBe(404);
  });

  it("returns 400 for reject without reason", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);
    const response = await request(app)
      .post(`/api/events/${createResponse.body.id}/reject`)
      .set("x-user-role", "MODERATOR")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 404 for reject missing event", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/events/missing/reject")
      .set("x-user-role", "MODERATOR")
      .send({ rejectionReason: "Motif" });

    expect(response.status).toBe(404);
  });

  it("returns 401 when role is missing", async () => {
    const app = createApp();
    const response = await request(app).post("/api/events").send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authentication required" });
  });

  it("returns 403 when role is forbidden", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send(validPayload);

    const publishResponse = await request(app)
      .post(`/api/events/${createResponse.body.id}/publish`)
      .set("x-user-role", "EDITOR");

    expect(publishResponse.status).toBe(403);
    expect(publishResponse.body).toEqual({ message: "Forbidden" });
  });

  it("returns errors for invalid payload", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Le titre est requis.");
  });
});
