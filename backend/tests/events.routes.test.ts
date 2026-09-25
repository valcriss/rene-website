import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { createEventRouter } from "../src/events/routes";
import { EventRepository } from "../src/events/repository";
import { AuthRepository } from "../src/auth/repository";
import { signUserToken } from "../src/auth/jwt";
import { authenticateOptional } from "../src/auth/middleware";
import { authHeader } from "./authTestUtils";

const validPayload = {
  title: "Concert",
  content: "Soirée jazz",
  image: "https://example.com/image.jpg",
  imageAlt: "Musiciens sur scène",
  categoryId: "music",
  audienceId: "all",
  organizerName: "Association",
  occurrences: [
    {
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle des fêtes",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes"
    }
  ]
};

describe("events routes", () => {
  const authRepo: AuthRepository = {
    getUserByEmail: async () => null,
    getUserById: async () => null,
    listUsersByRole: async () => [],
    createEditorUser: async () => null,
    updatePasswordHash: async () => undefined,
    createPasswordResetToken: async () => undefined,
    getPasswordResetTokenByHash: async () => null,
    deletePasswordResetTokensByUserId: async () => undefined
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
    const response = await request(app).get("/api/events").set("Authorization", authHeader("EDITOR"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 401 when listing or reading events without a role", async () => {
    const app = createApp();
    const listResponse = await request(app).get("/api/events");
    const getResponse = await request(app).get("/api/events/unknown");

    expect(listResponse.status).toBe(401);
    expect(getResponse.status).toBe(401);
  });

  it("returns 500 and logs when list fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const repo: EventRepository = {
      list: async () => {
        throw new Error("boom");
      },
      getById: async () => null,
      findBySlug: async () => null,
      resolveSlugRedirect: async () => null,
      setSlug: async () => null,
      create: async () => {
        throw new Error("boom");
      },
      update: async () => null,
      upsertPendingRevision: async () => null,
      submitPendingRevision: async () => null,
      rejectPendingRevision: async () => null,
      publishPendingRevision: async () => null,
      updateFeatured: async () => null,
      archiveEvent: async () => null,
      unarchiveEvent: async () => null,
      delete: async () => false,
      updateStatus: async () => null
    };
    const app = express();
    app.use(express.json());
    app.use(authenticateOptional);
    app.use("/api", createEventRouter(repo, authRepo));

    const response = await request(app).get("/api/events").set("Authorization", authHeader("EDITOR"));

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("returns 404 for missing event", async () => {
    const app = createApp();
    const response = await request(app).get("/api/events/unknown").set("Authorization", authHeader("EDITOR"));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ errors: ["Événement introuvable."] });
  });

  it("creates and fetches event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toBeDefined();
    expect(createResponse.body.status).toBe("DRAFT");

    const listResponse = await request(app).get("/api/events").set("Authorization", authHeader("EDITOR"));
    expect(listResponse.body).toHaveLength(1);

    const getResponse = await request(app)
      .get(`/api/events/${createResponse.body.id}`)
      .set("Authorization", authHeader("EDITOR"));
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
      .send(validPayload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.createdByUserId).toBe("user-1");
  });

  it("deletes an owned draft using the authenticated user from the token", async () => {
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
      .send(validPayload);

    const deleteResponse = await request(app)
      .delete(`/api/events/${createResponse.body.id}`)
      .set("Authorization", `Bearer ${tokenResult.value}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ id: createResponse.body.id });
  });

  it("rejects spoofed identity headers", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("x-user-role", "EDITOR")
      .set("x-user-id", "header-user")
      .send(validPayload);

    expect(createResponse.status).toBe(401);
    expect(createResponse.body).toEqual({ message: "Authentication required" });
  });

  it("updates event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);

    const updatePayload = { ...validPayload, title: "Concert mis à jour" };
    const updateResponse = await request(app)
      .put(`/api/events/${createResponse.body.id}`)
      .set("Authorization", authHeader("EDITOR"))
      .send(updatePayload);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.title).toBe("Concert mis à jour");
  });

  it("returns 404 for update missing event", async () => {
    const app = createApp();
    const response = await request(app)
      .put("/api/events/missing")
      .set("Authorization", authHeader("ADMIN"))
      .send(validPayload);

    expect(response.status).toBe(404);
  });

  it("returns 400 for update validation errors", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);

    const response = await request(app)
      .put(`/api/events/${createResponse.body.id}`)
      .set("Authorization", authHeader("EDITOR"))
      .send({});

    expect(response.status).toBe(400);
  });

  it("blocks horizontal IDOR attempts without exposing whether the event exists", async () => {
    const app = createApp();
    const ownerHeader = authHeader("EDITOR", "editor-owner");
    const otherHeader = authHeader("EDITOR", "editor-other");
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", ownerHeader)
      .send(validPayload);
    const id = createResponse.body.id;

    const [readResponse, updateResponse, submitResponse, deleteResponse, missingResponse] = await Promise.all([
      request(app).get(`/api/events/${id}`).set("Authorization", otherHeader),
      request(app)
        .put(`/api/events/${id}`)
        .set("Authorization", otherHeader)
        .send({ ...validPayload, title: "Titre détourné" }),
      request(app).post(`/api/events/${id}/submit`).set("Authorization", otherHeader),
      request(app).delete(`/api/events/${id}`).set("Authorization", otherHeader),
      request(app).delete("/api/events/does-not-exist").set("Authorization", otherHeader)
    ]);

    for (const response of [readResponse, updateResponse, submitResponse, deleteResponse, missingResponse]) {
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ errors: ["Action non autorisée."] });
    }

    const ownerReadResponse = await request(app).get(`/api/events/${id}`).set("Authorization", ownerHeader);
    expect(ownerReadResponse.status).toBe(200);
    expect(ownerReadResponse.body.title).toBe(validPayload.title);
  });

  it("filters back-office reads by ownership and moderation responsibility", async () => {
    const app = createApp();
    const firstEditor = authHeader("EDITOR", "editor-one");
    const secondEditor = authHeader("EDITOR", "editor-two");
    const first = await request(app)
      .post("/api/events")
      .set("Authorization", firstEditor)
      .send({ ...validPayload, title: "Premier brouillon" });
    const second = await request(app)
      .post("/api/events")
      .set("Authorization", secondEditor)
      .send({ ...validPayload, title: "Second brouillon" });

    const editorList = await request(app).get("/api/events").set("Authorization", firstEditor);
    const moderatorDraftList = await request(app)
      .get("/api/events")
      .set("Authorization", authHeader("MODERATOR", "moderator-one"));
    const adminList = await request(app).get("/api/events").set("Authorization", authHeader("ADMIN"));

    expect(editorList.body.map((event: { id: string }) => event.id)).toEqual([first.body.id]);
    expect(moderatorDraftList.body).toEqual([]);
    expect(adminList.body).toHaveLength(2);

    await request(app).post(`/api/events/${second.body.id}/submit`).set("Authorization", secondEditor);
    const moderatorPendingList = await request(app)
      .get("/api/events")
      .set("Authorization", authHeader("MODERATOR", "moderator-one"));
    expect(moderatorPendingList.body.map((event: { id: string }) => event.id)).toEqual([second.body.id]);
  });

  it("submits, publishes, and rejects pending content", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    const submitResponse = await request(app)
      .post(`/api/events/${id}/submit`)
      .set("Authorization", authHeader("EDITOR"));
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.status).toBe("PENDING");

    const publishResponse = await request(app)
      .post(`/api/events/${id}/publish`)
      .set("Authorization", authHeader("MODERATOR"));
    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.status).toBe("PUBLISHED");
    expect(publishResponse.body.featured).toBe(false);

    const createRejectedCandidateResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send({ ...validPayload, title: "Concert à refuser" });
    const rejectedCandidateId = createRejectedCandidateResponse.body.id;

    const submitRejectedCandidateResponse = await request(app)
      .post(`/api/events/${rejectedCandidateId}/submit`)
      .set("Authorization", authHeader("EDITOR"));
    expect(submitRejectedCandidateResponse.status).toBe(200);

    const rejectResponse = await request(app)
      .post(`/api/events/${rejectedCandidateId}/reject`)
      .set("Authorization", authHeader("MODERATOR"))
      .send({ rejectionReason: "Motif" });
    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.status).toBe("REJECTED");
  });

  it("saves a published update as draft revision before explicit submit", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    await request(app)
      .post(`/api/events/${id}/submit`)
      .set("Authorization", authHeader("EDITOR"));

    await request(app)
      .post(`/api/events/${id}/publish`)
      .set("Authorization", authHeader("MODERATOR"));

    const updateResponse = await request(app)
      .put(`/api/events/${id}`)
      .set("Authorization", authHeader("EDITOR"))
      .send({ ...validPayload, title: "Concert révisé" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe("PUBLISHED");
    expect(updateResponse.body.pendingRevision.status).toBe("DRAFT");
    expect(updateResponse.body.pendingRevision.title).toBe("Concert révisé");

    const submitResponse = await request(app)
      .post(`/api/events/${id}/submit`)
      .set("Authorization", authHeader("EDITOR"));

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.pendingRevision.status).toBe("PENDING");
  });

  it("deletes event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR", "editor-1"))
      .send(validPayload);

    const deleteResponse = await request(app)
      .delete(`/api/events/${createResponse.body.id}`)
      .set("Authorization", authHeader("EDITOR", "editor-1"));

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ id: createResponse.body.id });
  });

  it("forbids editors from deleting published events", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR", "editor-1"))
      .send(validPayload);
    const id = createResponse.body.id;

    await request(app)
      .post(`/api/events/${id}/submit`)
      .set("Authorization", authHeader("EDITOR", "editor-1"));

    await request(app)
      .post(`/api/events/${id}/publish`)
      .set("Authorization", authHeader("MODERATOR"));

    const deleteResponse = await request(app)
      .delete(`/api/events/${id}`)
      .set("Authorization", authHeader("EDITOR", "editor-1"));

    expect(deleteResponse.status).toBe(403);
    expect(deleteResponse.body.errors).toContain("Suppression non autorisée.");
  });

  it("returns 404 when delete missing", async () => {
    const app = createApp();
    const response = await request(app)
      .delete("/api/events/missing")
      .set("Authorization", authHeader("ADMIN"));

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("Événement introuvable.");
  });

  it("returns 404 for submit/publish missing event", async () => {
    const app = createApp();
    const submitResponse = await request(app)
      .post("/api/events/missing/submit")
      .set("Authorization", authHeader("ADMIN"));
    const publishResponse = await request(app)
      .post("/api/events/missing/publish")
      .set("Authorization", authHeader("MODERATOR"));

    expect(submitResponse.status).toBe(404);
    expect(publishResponse.status).toBe(404);
  });

  it("publishes with featured flag and updates featured after publication", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    await request(app)
      .post(`/api/events/${id}/submit`)
      .set("Authorization", authHeader("EDITOR"));

    const publishResponse = await request(app)
      .post(`/api/events/${id}/publish`)
      .set("Authorization", authHeader("MODERATOR"))
      .send({ featured: true });

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.featured).toBe(true);

    const toggleResponse = await request(app)
      .patch(`/api/events/${id}/featured`)
      .set("Authorization", authHeader("ADMIN"))
      .send({ featured: false });

    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body.featured).toBe(false);
  });

  it("returns 400 for invalid featured payloads", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    await request(app)
      .post(`/api/events/${id}/submit`)
      .set("Authorization", authHeader("EDITOR"));

    const publishResponse = await request(app)
      .post(`/api/events/${id}/publish`)
      .set("Authorization", authHeader("MODERATOR"))
      .send({ featured: "yes" });

    expect(publishResponse.status).toBe(400);

    const patchResponse = await request(app)
      .patch(`/api/events/${id}/featured`)
      .set("Authorization", authHeader("ADMIN"))
      .send({ featured: "yes" });

    expect(patchResponse.status).toBe(400);
  });

  it("returns 404 when updating featured on a missing event", async () => {
    const app = createApp();
    const response = await request(app)
      .patch("/api/events/missing/featured")
      .set("Authorization", authHeader("ADMIN"))
      .send({ featured: true });

    expect(response.status).toBe(404);
  });

  it("assigns a slug on first publication and lets an admin explicitly change it", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    await request(app).post(`/api/events/${id}/submit`).set("Authorization", authHeader("EDITOR"));
    const publishResponse = await request(app)
      .post(`/api/events/${id}/publish`)
      .set("Authorization", authHeader("MODERATOR"));

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.slug).toBe("concert-descartes-2026");

    const slugResponse = await request(app)
      .patch(`/api/events/${id}/slug`)
      .set("Authorization", authHeader("ADMIN"))
      .send({ slug: "concert-jazz-descartes-2026" });

    expect(slugResponse.status).toBe(200);
    expect(slugResponse.body.slug).toBe("concert-jazz-descartes-2026");
  });

  it("returns 400 for an invalid slug format", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;
    await request(app).post(`/api/events/${id}/submit`).set("Authorization", authHeader("EDITOR"));
    await request(app).post(`/api/events/${id}/publish`).set("Authorization", authHeader("MODERATOR"));

    const response = await request(app)
      .patch(`/api/events/${id}/slug`)
      .set("Authorization", authHeader("ADMIN"))
      .send({ slug: "Not A Valid Slug!" });

    expect(response.status).toBe(400);
  });

  it("returns 400 changing the slug of an event that was never published", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    const response = await request(app)
      .patch(`/api/events/${id}/slug`)
      .set("Authorization", authHeader("ADMIN"))
      .send({ slug: "concert-descartes-2026" });

    expect(response.status).toBe(400);
  });

  it("returns 400 when the requested slug is already used by another event", async () => {
    const app = createApp();

    const firstCreate = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    await request(app).post(`/api/events/${firstCreate.body.id}/submit`).set("Authorization", authHeader("EDITOR"));
    await request(app).post(`/api/events/${firstCreate.body.id}/publish`).set("Authorization", authHeader("MODERATOR"));

    const secondCreate = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send({ ...validPayload, title: "Autre concert" });
    await request(app).post(`/api/events/${secondCreate.body.id}/submit`).set("Authorization", authHeader("EDITOR"));
    await request(app).post(`/api/events/${secondCreate.body.id}/publish`).set("Authorization", authHeader("MODERATOR"));

    const response = await request(app)
      .patch(`/api/events/${secondCreate.body.id}/slug`)
      .set("Authorization", authHeader("ADMIN"))
      .send({ slug: "concert-descartes-2026" });

    expect(response.status).toBe(400);
  });

  it("returns 404 when changing the slug of a missing event", async () => {
    const app = createApp();
    const response = await request(app)
      .patch("/api/events/missing/slug")
      .set("Authorization", authHeader("ADMIN"))
      .send({ slug: "concert-descartes-2026" });

    expect(response.status).toBe(404);
  });

  it("returns 403 when a non-admin tries to change a slug", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;
    await request(app).post(`/api/events/${id}/submit`).set("Authorization", authHeader("EDITOR"));
    await request(app).post(`/api/events/${id}/publish`).set("Authorization", authHeader("MODERATOR"));

    const response = await request(app)
      .patch(`/api/events/${id}/slug`)
      .set("Authorization", authHeader("MODERATOR"))
      .send({ slug: "concert-jazz-descartes-2026" });

    expect(response.status).toBe(403);
  });

  it("archives and unarchives a published event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    await request(app).post(`/api/events/${id}/submit`).set("Authorization", authHeader("EDITOR"));
    await request(app).post(`/api/events/${id}/publish`).set("Authorization", authHeader("MODERATOR")).send({});

    const archiveResponse = await request(app)
      .post(`/api/events/${id}/archive`)
      .set("Authorization", authHeader("ADMIN"));

    expect(archiveResponse.status).toBe(200);
    expect(typeof archiveResponse.body.archivedAt).toBe("string");

    const unarchiveResponse = await request(app)
      .post(`/api/events/${id}/unarchive`)
      .set("Authorization", authHeader("ADMIN"));

    expect(unarchiveResponse.status).toBe(200);
    expect(unarchiveResponse.body.archivedAt).toBeNull();
  });

  it("returns 400 when archiving a non-published event", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    const response = await request(app)
      .post(`/api/events/${id}/archive`)
      .set("Authorization", authHeader("ADMIN"));

    expect(response.status).toBe(400);
  });

  it("returns 404 for archive/unarchive on a missing event", async () => {
    const app = createApp();
    const archiveResponse = await request(app)
      .post("/api/events/missing/archive")
      .set("Authorization", authHeader("ADMIN"));
    const unarchiveResponse = await request(app)
      .post("/api/events/missing/unarchive")
      .set("Authorization", authHeader("ADMIN"));

    expect(archiveResponse.status).toBe(404);
    expect(unarchiveResponse.status).toBe(404);
  });

  it("forbids editors from archiving or unarchiving events", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const id = createResponse.body.id;

    const archiveResponse = await request(app)
      .post(`/api/events/${id}/archive`)
      .set("Authorization", authHeader("EDITOR"));
    const unarchiveResponse = await request(app)
      .post(`/api/events/${id}/unarchive`)
      .set("Authorization", authHeader("EDITOR"));

    expect(archiveResponse.status).toBe(403);
    expect(unarchiveResponse.status).toBe(403);
  });

  it("returns 400 for reject without reason", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);
    const response = await request(app)
      .post(`/api/events/${createResponse.body.id}/reject`)
      .set("Authorization", authHeader("MODERATOR"))
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 404 for reject missing event", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/events/missing/reject")
      .set("Authorization", authHeader("MODERATOR"))
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
      .set("Authorization", authHeader("EDITOR"))
      .send(validPayload);

    const publishResponse = await request(app)
      .post(`/api/events/${createResponse.body.id}/publish`)
      .set("Authorization", authHeader("EDITOR"));

    expect(publishResponse.status).toBe(403);
    expect(publishResponse.body).toEqual({ message: "Forbidden" });
  });

  it("returns errors for invalid payload", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Le titre est requis.");
  });
});
