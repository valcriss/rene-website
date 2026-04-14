import express from "express";
import request from "supertest";
import { createEventRouter } from "../src/events/routes";
import { EventRepository } from "../src/events/repository";
import { AuthRepository } from "../src/auth/repository";
import { Event } from "../src/events/types";

jest.mock("../src/notifications/service", () => ({
  notifyEventSubmitted: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
  notifyEventResubmitted: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
  notifyEventPublished: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
  notifyEventRejected: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
  notifyEventDeleted: jest.fn(async () => ({ ok: false, errors: ["boom"] }))
}));

const baseEvent: Event = {
  id: "1",
  title: "Concert",
  content: "Texte",
  image: "https://example.com/img.png",
  createdByUserId: null,
  categoryId: "music",
  audienceId: "all",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "1 rue",
  postalCode: "37160",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  organizerName: "Association",
  status: "DRAFT",
  publishedAt: null,
  publicationEndAt: "2026-01-15T22:00:00.000Z",
  rejectionReason: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const authRepo: AuthRepository = {
  getUserByEmail: async () => null,
  getUserById: async () => null,
  listUsersByRole: async () => []
};

const notificationMocks = jest.requireMock("../src/notifications/service") as {
  notifyEventSubmitted: jest.Mock;
  notifyEventResubmitted: jest.Mock;
  notifyEventPublished: jest.Mock;
  notifyEventRejected: jest.Mock;
  notifyEventDeleted: jest.Mock;
};

const buildRepo = (event: Event): EventRepository => ({
  list: async () => [event],
  getById: async () => event,
  create: async () => event,
  update: async () => event,
  upsertPendingRevision: async () => event,
  submitPendingRevision: async () => event,
  rejectPendingRevision: async () => event,
  publishPendingRevision: async () => event,
  delete: async () => true,
  updateStatus: async (_id, status, data) => ({
    ...event,
    status,
    publishedAt: data.publishedAt,
    rejectionReason: data.rejectionReason,
    publicationEndAt: data.publicationEndAt
  })
});

describe("events routes notification warnings", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    notificationMocks.notifyEventSubmitted.mockClear();
    notificationMocks.notifyEventResubmitted.mockClear();
    notificationMocks.notifyEventPublished.mockClear();
    notificationMocks.notifyEventRejected.mockClear();
    notificationMocks.notifyEventDeleted.mockClear();
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
    fetchMock.mockReset();
  });

  it("does not log warning when saving a published revision draft", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const publishedEvent = {
      ...baseEvent,
      status: "PUBLISHED" as const,
      publishedAt: "2026-01-15T20:00:00.000Z"
    };
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo(publishedEvent), authRepo));

    const response = await request(app)
      .put("/api/events/1")
      .set("x-user-role", "EDITOR")
      .send(baseEvent);

    expect(response.status).toBe(200);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("logs warning when submit notification fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo(baseEvent), authRepo));

    const response = await request(app)
      .post("/api/events/1/submit")
      .set("x-user-role", "EDITOR");

    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("logs warning when resubmission notification fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo({ ...baseEvent, status: "REJECTED" }), authRepo));

    const response = await request(app)
      .post("/api/events/1/submit")
      .set("x-user-role", "EDITOR");

    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("logs warning when publish notification fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo(baseEvent), authRepo));

    const response = await request(app)
      .post("/api/events/1/publish")
      .set("x-user-role", "MODERATOR");

    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("logs warning when reject notification fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo(baseEvent), authRepo));

    const response = await request(app)
      .post("/api/events/1/reject")
      .set("x-user-role", "MODERATOR")
      .send({ rejectionReason: "Motif" });

    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("logs warning when delete notification fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo(baseEvent), authRepo));

    const response = await request(app)
      .delete("/api/events/1")
      .set("x-user-role", "EDITOR");

    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("builds reject notification snapshot from published revision while preserving owner id", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const publishedEvent = {
      ...baseEvent,
      createdByUserId: "owner-1",
      status: "PUBLISHED" as const,
      publishedAt: "2026-01-15T20:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "1",
        createdByUserId: "editor-2",
        title: "Concert révisé",
        status: "PENDING" as const,
        rejectionReason: null
      }
    };
    const app = express();
    app.use(express.json());
    app.use("/api", createEventRouter(buildRepo(publishedEvent), authRepo));

    const response = await request(app)
      .post("/api/events/1/reject")
      .set("x-user-role", "MODERATOR")
      .send({ rejectionReason: "Motif" });

    expect(response.status).toBe(200);
    expect(notificationMocks.notifyEventRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        title: "Concert révisé",
        createdByUserId: "owner-1",
        status: "PENDING"
      }),
      authRepo
    );
    warnSpy.mockRestore();
  });
});
