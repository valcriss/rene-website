import { createEvent, deleteEvent, getEvent, listEvents, publishEvent, rejectEvent, submitEvent, updateEvent, updateEventFeatured } from "../src/events/service";
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
  audienceId: "all",
  eventStartAt: "2026-01-15T00:00:00.000Z",
  eventEndAt: "2026-01-15T23:59:59.999Z",
  allDay: true,
  venueName: "Salle",
  address: "1 rue du centre",
  postalCode: "37160",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  geolocationPrecision: "EXACT",
  organizerName: "Association",
  featured: false,
  status: "DRAFT",
  publishedAt: null,
  publicationEndAt: "2026-01-15T23:59:59.999Z",
  rejectionReason: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const createRepo = (event: Event | null, overrides: Partial<EventRepository> = {}): EventRepository => ({
  list: async () => (event ? [event] : []),
  getById: async () => event,
  create: async () => event ?? fallbackEvent,
  update: async () => event,
  upsertPendingRevision: async () => event,
  submitPendingRevision: async () => event,
  rejectPendingRevision: async () => event,
  publishPendingRevision: async () => event,
  updateFeatured: async () => event,
  delete: async () => Boolean(event),
  updateStatus: async () => event,
  ...overrides
});

describe("event services", () => {
  const fetchMock = jest.fn();
  const mockPhotonNotFound = () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) });
  };

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
    audienceId: "all",
    eventStartAt: "2026-01-15T00:00:00.000Z",
    eventEndAt: "2026-01-15T23:59:59.999Z",
    allDay: true,
    venueName: "Salle",
    address: "1 rue du centre",
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    geolocationPrecision: "EXACT",
    organizerName: "Association",
    featured: false,
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: "2026-01-15T23:59:59.999Z",
    rejectionReason: null,
    pendingRevision: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  it("lists and gets events", async () => {
    const repo = createRepo(baseEvent);

    await expect(listEvents(repo)).resolves.toEqual([baseEvent]);
    await expect(getEvent(repo, "id")).resolves.toEqual(baseEvent);
  });

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

  it("normalizes dates before creating", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input }));
    const repo = createRepo(baseEvent, { create });

    await createEvent(repo, {
      ...baseEvent,
      eventStartAt: "2026-01-15T14:30:00.000Z",
      eventEndAt: "2026-01-16T09:15:00.000Z",
      allDay: false
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventStartAt: "2026-01-15T00:00:00.000Z",
        eventEndAt: "2026-01-16T23:59:59.999Z",
        allDay: true
      })
    );
  });

  it("normalizes dates before updating", async () => {
    const update = jest.fn(async (_id, input) => ({ ...baseEvent, ...input }));
    const repo = createRepo(baseEvent, {
      list: async () => [],
      update
    });

    await updateEvent(repo, "id", {
      ...baseEvent,
      eventStartAt: "2026-01-15T14:30:00.000Z",
      eventEndAt: "2026-01-16T09:15:00.000Z",
      allDay: false
    });

    expect(update).toHaveBeenCalledWith(
      "id",
      expect.objectContaining({
        eventStartAt: "2026-01-15T00:00:00.000Z",
        eventEndAt: "2026-01-16T23:59:59.999Z",
        allDay: true
      })
    );
  });

  it("normalizes valid non-iso date strings before creating", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input }));
    const repo = createRepo(baseEvent, { create });

    await createEvent(repo, {
      ...baseEvent,
      eventStartAt: "Thu, 15 Jan 2026 14:30:00 GMT",
      eventEndAt: "Fri, 16 Jan 2026 09:15:00 GMT",
      allDay: false
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventStartAt: "2026-01-15T00:00:00.000Z",
        eventEndAt: "2026-01-16T23:59:59.999Z",
        allDay: true
      })
    );
  });

  it("deletes previous image when updated", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      update: async () => ({ ...baseEvent, image: "/uploads/new.png" })
    });

    await updateEvent(repo, "id", baseEvent);

    expect(deleteUploadIfLocal).toHaveBeenCalledWith(baseEvent.image);
  });

  it("updateEvent returns validation errors", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", {});
    expect(result.ok).toBe(false);
  });

  it("updateEvent returns errors when geocoding fails", async () => {
    mockPhotonNotFound();
    const repo = createRepo(baseEvent, {
      update: async (_id, input) => ({ ...baseEvent, ...input })
    });
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBeNull();
      expect(result.value.longitude).toBeNull();
      expect(result.value.geolocationPrecision).toBe("UNRESOLVED");
    }
  });

  it("updateEvent blocks direct pending events", async () => {
    const repo = createRepo({ ...baseEvent, status: "PENDING" });
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'événement ne peut pas être modifié tant qu'il est en attente de modération.");
    }
  });

  it("updateEvent blocks published events with a pending revision", async () => {
    const repo = createRepo({
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        status: "PENDING",
        rejectionReason: null
      }
    });
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'événement ne peut pas être modifié tant qu'il est en attente de modération.");
    }
  });

  it("updateEvent returns not found when update returns null", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      update: async () => null
    });
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

  it("rejectEvent returns not found on missing event", async () => {
    const repo = createRepo(null);
    const result = await rejectEvent(repo, "missing", "Motif");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("rejectEvent succeeds", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, status: "REJECTED", rejectionReason: "Motif" })
    });
    const result = await rejectEvent(repo, "id", "Motif");
    expect(result.ok).toBe(true);
  });

  it("rejectEvent returns not found when updateStatus fails", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      updateStatus: async () => null
    });
    const result = await rejectEvent(repo, "id", "Motif");
    expect(result.ok).toBe(false);
  });

  it("submitEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await submitEvent(repo, "missing");
    expect(result.ok).toBe(false);
  });

  it("submitEvent succeeds", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, status: "PENDING" })
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("submitEvent returns not found when updateStatus fails", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      updateStatus: async () => null
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
  });

  it("publishEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await publishEvent(repo, "missing");
    expect(result.ok).toBe(false);
  });

  it("publishEvent succeeds", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, status: "PUBLISHED", featured: true, publishedAt: "2026-01-01T00:00:00.000Z" })
    });
    const result = await publishEvent(repo, "id", true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.featured).toBe(true);
    }
  });

  it("publishEvent rejects invalid featured flag", async () => {
    const repo = createRepo(baseEvent);
    const result = await publishEvent(repo, "id", "yes");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La mise en avant doit être un booléen.");
    }
  });

  it("publishEvent returns not found when updateStatus fails", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      updateStatus: async () => null
    });
    const result = await publishEvent(repo, "id");
    expect(result.ok).toBe(false);
  });

  it("updates featured state on published event", async () => {
    const repo = createRepo({ ...baseEvent, status: "PUBLISHED", featured: false }, {
      updateFeatured: async () => ({ ...baseEvent, status: "PUBLISHED", featured: true, publishedAt: "2026-01-01T00:00:00.000Z" })
    });
    const result = await updateEventFeatured(repo, "id", true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.featured).toBe(true);
    }
  });

  it("returns not found when updating featured state on missing event", async () => {
    const repo = createRepo(null);
    const result = await updateEventFeatured(repo, "missing", true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("rejects invalid featured value when updating featured state", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEventFeatured(repo, "id", "yes");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La mise en avant doit être un booléen.");
    }
  });

  it("rejects featured update for non-published event", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEventFeatured(repo, "id", true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Seuls les événements publiés peuvent être mis en avant.");
    }
  });

  it("returns not found when featured update repository call fails", async () => {
    const repo = createRepo({ ...baseEvent, status: "PUBLISHED", featured: false }, {
      updateFeatured: async () => null
    });
    const result = await updateEventFeatured(repo, "id", true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
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
    mockPhotonNotFound();
    const repo = createRepo(baseEvent, {
      create: async (input) => ({ ...fallbackEvent, ...input, id: "created" })
    });
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBeNull();
      expect(result.value.longitude).toBeNull();
      expect(result.value.geolocationPrecision).toBe("UNRESOLVED");
    }
  });

  it("createEvent returns errors when geocoding throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const repo = createRepo(baseEvent, {
      create: async (input) => ({ ...fallbackEvent, ...input, id: "created" })
    });
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBeNull();
      expect(result.value.longitude).toBeNull();
      expect(result.value.geolocationPrecision).toBe("UNRESOLVED");
    }
  });

  it("creates a title-only draft without dates or allDay", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input }));
    const repo = createRepo(baseEvent, { create });

    const result = await createEvent(repo, { title: "Brouillon" });

    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ eventStartAt: null, eventEndAt: null, allDay: null })
    );
  });

  it("submitEvent blocks a draft missing fields required for submission", async () => {
    const repo = createRepo({ ...baseEvent, content: null, organizerName: null });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le contenu est requis.");
      expect(result.errors).toContain("L'organisateur est requis.");
    }
  });

  it("submitEvent blocks a published revision missing fields required for submission", async () => {
    const repo = createRepo({
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        content: null,
        status: "DRAFT",
        rejectionReason: null
      }
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le contenu est requis.");
    }
  });

  it("submitEvent allows approximate geolocation", async () => {
    const repo = createRepo({ ...baseEvent, geolocationPrecision: "APPROXIMATE" }, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, geolocationPrecision: "APPROXIMATE", status: "PENDING" })
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("submitEvent treats legacy geolocated events without explicit precision as exact", async () => {
    const legacyEvent = { ...baseEvent };
    delete legacyEvent.geolocationPrecision;
    const repo = createRepo(legacyEvent, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, status: "PENDING" })
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("submitEvent blocks legacy unresolved events without explicit precision", async () => {
    const legacyEvent = { ...baseEvent, latitude: null, longitude: null };
    delete legacyEvent.geolocationPrecision;
    const repo = createRepo(legacyEvent);
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La localisation doit être corrigée avant la soumission à modération.");
    }
  });

  it("submitEvent blocks draft without resolved location", async () => {
    const repo = createRepo({ ...baseEvent, latitude: null, longitude: null });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La localisation doit être corrigée avant la soumission à modération.");
    }
  });

  it("submitEvent blocks published revision without resolved location", async () => {
    const repo = createRepo({
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        latitude: null,
        longitude: null,
        status: "DRAFT",
        rejectionReason: null
      }
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La localisation doit être corrigée avant la soumission à modération.");
    }
  });

  it("createEvent returns repo error", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      create: async () => {
        throw new Error("boom");
      }
    });
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("boom");
    }
  });

  it("createEvent returns unknown error when non-error thrown", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      create: async () => {
        throw "boom";
      }
    });
    const result = await createEvent(repo, baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("updateEvent returns repo error", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      update: async () => {
        throw new Error("boom");
      }
    });
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("boom");
    }
  });

  it("updateEvent returns unknown error when non-error thrown", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      update: async () => {
        throw "boom";
      }
    });
    const result = await updateEvent(repo, "id", baseEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("deleteEvent returns not found", async () => {
    const repo = createRepo(null);
    const result = await deleteEvent(repo, "missing", { role: "EDITOR", userId: "owner-1" });
    expect(result.ok).toBe(false);
  });

  it("deleteEvent lets editors remove their own drafts", async () => {
    const repo = createRepo({ ...baseEvent, createdByUserId: "owner-1" });
    const result = await deleteEvent(repo, "id", { role: "EDITOR", userId: "owner-1" });
    expect(result.ok).toBe(true);
    expect(deleteUploadIfLocal).toHaveBeenCalledWith(baseEvent.image);
  });

  it("deleteEvent forbids editors from removing published events", async () => {
    const repo = createRepo({
      ...baseEvent,
      createdByUserId: "owner-1",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    });
    const result = await deleteEvent(repo, "id", { role: "EDITOR", userId: "owner-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Suppression non autorisée.");
    }
  });

  it("deleteEvent forbids editors from removing drafts they do not own", async () => {
    const repo = createRepo({ ...baseEvent, createdByUserId: "owner-2" });
    const result = await deleteEvent(repo, "id", { role: "EDITOR", userId: "owner-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Suppression non autorisée.");
    }
  });

  it("deleteEvent lets moderators remove published events", async () => {
    const repo = createRepo({
      ...baseEvent,
      createdByUserId: "owner-1",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    });
    const result = await deleteEvent(repo, "id", { role: "MODERATOR", userId: null });
    expect(result.ok).toBe(true);
  });

  it("deleteEvent returns not found when delete fails", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      delete: async () => false
    });
    const result = await deleteEvent(repo, "id", { role: "MODERATOR", userId: null });
    expect(result.ok).toBe(false);
  });

  it("creates a pending revision when a published event is edited", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    };
    const repo = createRepo(publishedEvent, {
      upsertPendingRevision: async (_id, _input, status) => ({
        ...publishedEvent,
        pendingRevision: {
          ...baseEvent,
          id: "revision-1",
          eventId: publishedEvent.id,
          createdByUserId: null,
          status,
          rejectionReason: null,
          title: "Concert modifié"
        }
      })
    });

    const result = await updateEvent(repo, publishedEvent.id, { ...baseEvent, title: "Concert modifié" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("PUBLISHED");
      expect(result.value.pendingRevision?.status).toBe("DRAFT");
      expect(result.value.pendingRevision?.title).toBe("Concert modifié");
    }
  });

  it("creates a pending revision with null coordinates when geocoding fails for a published event", async () => {
    mockPhotonNotFound();
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    };
    const repo = createRepo(publishedEvent, {
      upsertPendingRevision: async (_id, input, status) => ({
        ...publishedEvent,
        pendingRevision: {
          ...baseEvent,
          ...input,
          id: "revision-1",
          eventId: publishedEvent.id,
          createdByUserId: null,
          status,
          rejectionReason: null
        }
      })
    });

    const result = await updateEvent(repo, publishedEvent.id, baseEvent);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pendingRevision?.latitude).toBeNull();
      expect(result.value.pendingRevision?.longitude).toBeNull();
    }
  });

  it("returns not found when published revision cannot be saved", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    };
    const repo = createRepo(publishedEvent, {
      upsertPendingRevision: async () => null
    });

    const result = await updateEvent(repo, publishedEvent.id, baseEvent);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("deletes replaced pending revision image on published update", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        image: "/uploads/old-revision.png",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      upsertPendingRevision: async (_id, _input, status) => ({
        ...publishedEvent,
        pendingRevision: {
          ...publishedEvent.pendingRevision!,
          image: "/uploads/new-revision.png",
          status
        }
      })
    });

    await updateEvent(repo, "id", baseEvent);

    expect(deleteUploadIfLocal).toHaveBeenCalledWith("/uploads/old-revision.png");
  });

  it("keeps pending revision image when it is unchanged on published update", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        image: "/uploads/same-revision.png",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      upsertPendingRevision: async (_id, _input, status) => ({
        ...publishedEvent,
        pendingRevision: {
          ...publishedEvent.pendingRevision!,
          image: "/uploads/same-revision.png",
          status
        }
      })
    });

    await updateEvent(repo, "id", baseEvent);

    expect(deleteUploadIfLocal).not.toHaveBeenCalledWith("/uploads/same-revision.png");
  });

  it("submits a published draft revision", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      submitPendingRevision: async () => ({
        ...publishedEvent,
        pendingRevision: {
          ...publishedEvent.pendingRevision!,
          status: "PENDING"
        }
      })
    });

    const result = await submitEvent(repo, "id");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pendingRevision?.status).toBe("PENDING");
    }
  });

  it("returns current event when published revision is already pending", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "PENDING",
        rejectionReason: null
      }
    };

    const result = await submitEvent(createRepo(publishedEvent), "id");

    expect(result).toEqual({ ok: true, value: publishedEvent });
  });

  it("returns errors when published submit revision is missing", async () => {
    const publishedWithoutRevision: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    };

    const result = await submitEvent(createRepo(publishedWithoutRevision), "id");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision introuvable.");
    }
  });

  it("returns errors when published submit cannot update revision", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      submitPendingRevision: async () => null
    });

    const result = await submitEvent(repo, "id");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision introuvable.");
    }
  });

  it("publishes a submitted revision and deletes old image", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      image: "/uploads/original.png",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        image: "/uploads/revision.png",
        createdByUserId: null,
        status: "PENDING",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      publishPendingRevision: async () => ({
        ...publishedEvent,
        image: "/uploads/revision.png",
        pendingRevision: null
      })
    });

    const result = await publishEvent(repo, "id");

    expect(result.ok).toBe(true);
    expect(deleteUploadIfLocal).toHaveBeenCalledWith("/uploads/original.png");
  });

  it("returns errors when published publish revision is missing", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    };

    const result = await publishEvent(createRepo(publishedEvent), "id");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision introuvable.");
    }
  });

  it("returns errors when published publish revision is not submitted", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };

    const result = await publishEvent(createRepo(publishedEvent), "id");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision non soumise.");
    }
  });

  it("returns errors when published publish cannot update revision", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "PENDING",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      publishPendingRevision: async () => null
    });

    const result = await publishEvent(repo, "id");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision introuvable.");
    }
  });

  it("rejects a submitted revision", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "PENDING",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      rejectPendingRevision: async () => ({
        ...publishedEvent,
        pendingRevision: {
          ...publishedEvent.pendingRevision!,
          status: "REJECTED",
          rejectionReason: "Motif"
        }
      })
    });

    const result = await rejectEvent(repo, "id", "Motif");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pendingRevision?.status).toBe("REJECTED");
    }
  });

  it("returns errors when published reject revision is missing", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    };

    const result = await rejectEvent(createRepo(publishedEvent), "id", "Motif");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision introuvable.");
    }
  });

  it("returns errors when published reject revision is not submitted", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };

    const result = await rejectEvent(createRepo(publishedEvent), "id", "Motif");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision non soumise.");
    }
  });

  it("returns errors when published reject cannot update revision", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "rev-1",
        eventId: "id",
        createdByUserId: null,
        status: "PENDING",
        rejectionReason: null
      }
    };
    const repo = createRepo(publishedEvent, {
      rejectPendingRevision: async () => null
    });

    const result = await rejectEvent(repo, "id", "Motif");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision introuvable.");
    }
  });

  it("does not publish a published event revision before submission", async () => {
    const publishedEvent: Event = {
      ...baseEvent,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      pendingRevision: {
        ...baseEvent,
        id: "revision-1",
        eventId: "id",
        createdByUserId: null,
        status: "DRAFT",
        rejectionReason: null
      }
    };

    const result = await publishEvent(createRepo(publishedEvent), "id");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Révision non soumise.");
    }
  });
});
