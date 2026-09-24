import express from "express";
import request from "supertest";
import { createPublicEventsRouter } from "../src/events/publicRoutes";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";

const baseOccurrence = {
  id: "occ-1",
  eventStartAt: "2026-01-15T00:00:00.000Z",
  eventEndAt: "2026-01-15T23:59:59.999Z",
  allDay: true,
  venueName: "Salle",
  address: "1 rue du centre",
  postalCode: "37160",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  geolocationPrecision: "EXACT" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const publishedEvent: Event = {
  id: "published-1",
  title: "Concert",
  content: "Soirée",
  image: "img",
  createdByUserId: "user-1",
  categoryId: "music",
  audienceId: "all",
  occurrences: [baseOccurrence],
  organizerName: "Association",
  contactEmail: "contact@example.com",
  contactPhone: "0102030405",
  featured: false,
  status: "PUBLISHED",
  publishedAt: "2026-01-01T00:00:00.000Z",
  publicationEndAt: "2026-01-15T23:59:59.999Z",
  rejectionReason: null,
  archivedAt: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const buildRepo = (events: Event[]): EventRepository => ({
  list: async () => events,
  getById: async (id) => events.find((event) => event.id === id) ?? null,
  create: async () => publishedEvent,
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
});

const buildApp = (events: Event[]) => {
  const app = express();
  app.use(express.json());
  app.use("/api/public", createPublicEventsRouter(buildRepo(events)));
  return app;
};

describe("public events routes", () => {
  it("lists only published, non-archived events without internal fields", async () => {
    const draftEvent: Event = { ...publishedEvent, id: "draft-1", status: "DRAFT" };
    const archivedEvent: Event = { ...publishedEvent, id: "archived-1", archivedAt: "2026-02-01T00:00:00.000Z" };
    const app = buildApp([publishedEvent, draftEvent, archivedEvent]);

    const response = await request(app).get("/api/public/events");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe("published-1");
    expect(response.body[0]).not.toHaveProperty("createdByUserId");
    expect(response.body[0]).not.toHaveProperty("rejectionReason");
    expect(response.body[0]).not.toHaveProperty("pendingRevision");
    expect(response.body[0].contactEmail).toBe("contact@example.com");
  });

  it("returns the published event without internal fields", async () => {
    const app = buildApp([publishedEvent]);

    const response = await request(app).get(`/api/public/events/${publishedEvent.id}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(publishedEvent.id);
    expect(response.body).not.toHaveProperty("createdByUserId");
    expect(response.body).not.toHaveProperty("rejectionReason");
    expect(response.body).not.toHaveProperty("pendingRevision");
  });

  it("returns 404 for a draft, pending, rejected or archived event", async () => {
    const draftEvent: Event = { ...publishedEvent, id: "draft-1", status: "DRAFT" };
    const archivedEvent: Event = { ...publishedEvent, id: "archived-1", archivedAt: "2026-02-01T00:00:00.000Z" };
    const app = buildApp([draftEvent, archivedEvent]);

    const draftResponse = await request(app).get(`/api/public/events/${draftEvent.id}`);
    const archivedResponse = await request(app).get(`/api/public/events/${archivedEvent.id}`);
    const missingResponse = await request(app).get("/api/public/events/unknown");

    expect(draftResponse.status).toBe(404);
    expect(archivedResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
  });

  it("returns 500 and logs when the repository throws", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const repo = buildRepo([]);
    repo.list = async () => {
      throw new Error("boom");
    };
    const app = express();
    app.use(express.json());
    app.use("/api/public", createPublicEventsRouter(repo));

    const response = await request(app).get("/api/public/events");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
