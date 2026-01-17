import { createEvent, deleteEvent, publishEvent, rejectEvent, submitEvent, updateEvent } from "../src/events/service";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";
import { deleteUploadIfLocal } from "../src/uploads/storage";

jest.mock("../src/uploads/storage", () => ({
  deleteUploadIfLocal: jest.fn()
}));

const fallbackEvent: Event = {
  id: "fallback",
  title: "Fallback",
  content: "Fallback",
  image: "img",
  createdByUserId: null,
  categoryId: "music",
  eventStartAt: "2026-01-15T20:00:00.000Z",
  eventEndAt: "2026-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "1 rue du centre",
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
  delete: async () => Boolean(event),
  updateStatus: async () => event
});

describe("event services", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
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

  const baseEvent: Event = {
    id: "id",
    title: "Concert",
    content: "Soirée",
    image: "img",
    createdByUserId: null,
    categoryId: "music",
    eventStartAt: "2026-01-15T20:00:00.000Z",
    eventEndAt: "2026-01-15T22:00:00.000Z",
    allDay: false,
    venueName: "Salle",
    address: "1 rue du centre",
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
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("updateEvent succeeds", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(true);
  });

  it("deletes previous image when updated", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => ({ ...baseEvent, image: "/uploads/new.png" }),
      delete: async () => true,
      updateStatus: async () => baseEvent
    };

    await updateEvent(repo, "id", baseEvent);

    expect(deleteUploadIfLocal).toHaveBeenCalledWith(baseEvent.image);
  });

  it("updateEvent returns validation errors", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", {});
    expect(result.ok).toBe(false);
  });

  it("updateEvent returns errors when geocoding fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) });
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Adresse introuvable.");
    }
  });

  it("updateEvent returns not found when update returns null", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => null,
      delete: async () => true,
      updateStatus: async () => baseEvent
    };
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("rejectEvent validates reason", async () => {
    const repo = createRepo(baseEvent);
    const result = await rejectEvent(repo, "id", "");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le motif de refus est requis.");
    }
  });

  it("rejectEvent succeeds", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      delete: async () => true,
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
      delete: async () => true,
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
      delete: async () => true,
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
      delete: async () => true,
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
      delete: async () => true,
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
      delete: async () => true,
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

  it("createEvent returns error for empty creator", async () => {
    const repo = createRepo(baseEvent);
    const result = await createEvent(repo, baseEvent, "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le créateur est requis.");
    }
  });

  it("createEvent returns errors when geocoding fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) });
    const repo = createRepo(baseEvent);
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Adresse introuvable.");
    }
  });

  it("createEvent returns errors when geocoding throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const repo = createRepo(baseEvent);
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le service de géolocalisation est indisponible.");
    }
  });

  it("createEvent returns repo error", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => {
        throw new Error("boom");
      },
      update: async () => baseEvent,
      delete: async () => true,
      updateStatus: async () => baseEvent
    };
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("boom");
    }
  });

  it("createEvent returns unknown error when non-error thrown", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => {
        throw "boom";
      },
      update: async () => baseEvent,
      delete: async () => true,
      updateStatus: async () => baseEvent
    };
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("updateEvent returns repo error", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => {
        throw new Error("boom");
      },
      delete: async () => true,
      updateStatus: async () => baseEvent
    };
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("boom");
    }
  });

  it("updateEvent returns unknown error when non-error thrown", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => {
        throw "boom";
      },
      delete: async () => true,
      updateStatus: async () => baseEvent
    };
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("deleteEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await deleteEvent(repo, "missing");
    expect(result.ok).toBe(false);
  });

  it("deleteEvent deletes image", async () => {
    const repo = createRepo(baseEvent);
    const result = await deleteEvent(repo, "id");
    expect(result.ok).toBe(true);
    expect(deleteUploadIfLocal).toHaveBeenCalledWith(baseEvent.image);
  });

  it("deleteEvent returns not found when delete fails", async () => {
    const repo: EventRepository = {
      list: async () => [],
      getById: async () => baseEvent,
      create: async () => baseEvent,
      update: async () => baseEvent,
      delete: async () => false,
      updateStatus: async () => baseEvent
    };
    const result = await deleteEvent(repo, "id");
    expect(result.ok).toBe(false);
  });
});
