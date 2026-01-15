import { createEvent, publishEvent, rejectEvent, submitEvent, updateEvent } from "../src/events/service";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";

const fallbackEvent: Event = {
  id: "fallback",
  title: "Fallback",
  content: "Fallback",
  image: "img",
  categoryId: "music",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  postalCode: "37160",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  organizerName: "Association",
  status: "DRAFT",
  publishedAt: null,
  publicationEndAt: "2026-01-15T22:00:00.000Z",
  rejectionReason: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const createRepo = (event: Event | null): EventRepository => ({
  list: async () => (event ? [event] : []),
  getById: async () => event,
  create: async () => event ?? fallbackEvent,
  update: async () => event,
  updateStatus: async () => event
});

describe("event services", () => {
  const baseEvent: Event = {
    id: "id",
    title: "Concert",
    content: "Soirée",
    image: "img",
    categoryId: "music",
    eventStartAt: "2026-01-15T20:00:00.000Z",
    eventEndAt: "2026-01-15T22:00:00.000Z",
    allDay: false,
    venueName: "Salle",
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    organizerName: "Association",
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: "2026-01-15T22:00:00.000Z",
    rejectionReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  it("updateEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await updateEvent(repo, "missing", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Event not found");
    }
  });

  it("updateEvent succeeds", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(true);
  });

  it("updateEvent returns validation errors", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", {});
    expect(result.ok).toBe(false);
  });

  it("rejectEvent validates reason", async () => {
    const repo = createRepo(baseEvent);
    const result = await rejectEvent(repo, "id", "");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("rejectionReason is required");
    }
  });

  it("rejectEvent succeeds", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      updateStatus: async () => ({ ...baseEvent, status: "REJECTED", rejectionReason: "Motif" })
    };
    const result = await rejectEvent(repo, "id", "Motif");
    expect(result.ok).toBe(true);
  });

  it("rejectEvent returns not found when updateStatus fails", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      updateStatus: async () => null
    };
    const result = await rejectEvent(repo, "id", "Motif");
    expect(result.ok).toBe(false);
  });

  it("submitEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await submitEvent(repo, "missing");
    expect(result.ok).toBe(false);
  });

  it("submitEvent succeeds", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      updateStatus: async () => ({ ...baseEvent, status: "PENDING" })
    };
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("submitEvent returns not found when updateStatus fails", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      updateStatus: async () => null
    };
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
  });

  it("publishEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await publishEvent(repo, "missing");
    expect(result.ok).toBe(false);
  });

  it("publishEvent succeeds", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      updateStatus: async () => ({ ...baseEvent, status: "PUBLISHED", publishedAt: "2026-01-01T00:00:00.000Z" })
    };
    const result = await publishEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("publishEvent returns not found when updateStatus fails", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      updateStatus: async () => null
    };
    const result = await publishEvent(repo, "id");
    expect(result.ok).toBe(false);
  });

  it("createEvent returns validation errors", async () => {
    const repo = createRepo(baseEvent);
    const result = await createEvent(repo, {});
    expect(result.ok).toBe(false);
  });
});
