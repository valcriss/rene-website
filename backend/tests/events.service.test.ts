import {
  archiveEvent as archiveEventForActor,
  createEvent as createEventForActor,
  deleteEvent,
  EventActor,
  getEvent,
  getEventForActor,
  listEvents,
  publishEvent as publishEventForActor,
  rejectEvent as rejectEventForActor,
  submitEvent as submitEventForActor,
  unarchiveEvent as unarchiveEventForActor,
  updateEvent as updateEventForActor,
  updateEventFeatured as updateEventFeaturedForActor
} from "../src/events/service";
import { EventRepository } from "../src/events/repository";
import { Event, EventOccurrence, EventOccurrenceInput } from "../src/events/types";
import {
  claimLocalUploads,
  deleteLocalUploads,
  deleteUnreferencedLocalUploads,
  releaseClaimedUploads
} from "../src/uploads/storage";

const toStoredOccurrences = (occurrences: EventOccurrenceInput[]): EventOccurrence[] =>
  occurrences.map((occurrence, index) => ({
    ...occurrence,
    id: `occ-${index}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }));

jest.mock("../src/uploads/storage", () => ({
  claimLocalUploads: jest.fn(async () => []),
  deleteLocalUploads: jest.fn(),
  deleteUnreferencedLocalUploads: jest.fn(),
  releaseClaimedUploads: jest.fn(async () => undefined)
}));

const adminActor: EventActor = { id: "admin-1", role: "ADMIN" };

// Existing service tests focus on validation and state transitions. These adapters keep
// their intent explicit while the production API requires an authenticated actor.
const createEvent = (repo: EventRepository, input: unknown, actor = adminActor) =>
  createEventForActor(repo, input, actor);
const updateEvent = (repo: EventRepository, id: string, input: unknown, actor = adminActor) =>
  updateEventForActor(repo, id, input, actor);
const submitEvent = (repo: EventRepository, id: string, actor = adminActor) =>
  submitEventForActor(repo, id, actor);
const publishEvent = (repo: EventRepository, id: string, featured: unknown = false, actor = adminActor) =>
  publishEventForActor(repo, id, actor, featured);
const updateEventFeatured = (repo: EventRepository, id: string, featured: unknown, actor = adminActor) =>
  updateEventFeaturedForActor(repo, id, featured, actor);
const archiveEvent = (repo: EventRepository, id: string, actor = adminActor) =>
  archiveEventForActor(repo, id, actor);
const unarchiveEvent = (repo: EventRepository, id: string, actor = adminActor) =>
  unarchiveEventForActor(repo, id, actor);
const rejectEvent = (repo: EventRepository, id: string, reason: unknown, actor = adminActor) =>
  rejectEventForActor(repo, id, reason, actor);

const baseOccurrence: EventOccurrence = {
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
  geolocationPrecision: "EXACT",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const fallbackEvent: Event = {
  id: "fallback",
  title: "Fallback",
  content: "Fallback",
  image: "img",
  createdByUserId: null,
  categoryId: "music",
  audienceId: "all",
  occurrences: [baseOccurrence],
  organizerName: "Association",
  featured: false,
  status: "DRAFT",
  publishedAt: null,
  publicationEndAt: "2026-01-15T23:59:59.999Z",
  rejectionReason: null,
  archivedAt: null,
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
  archiveEvent: async () => event,
  unarchiveEvent: async () => event,
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
    occurrences: [baseOccurrence],
    organizerName: "Association",
    featured: false,
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: "2026-01-15T23:59:59.999Z",
    rejectionReason: null,
    archivedAt: null,
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
      occurrences: [
        { ...baseOccurrence, eventStartAt: "2026-01-15T14:30:00.000Z", eventEndAt: "2026-01-16T09:15:00.000Z", allDay: false }
      ]
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrences: [
          expect.objectContaining({
            eventStartAt: "2026-01-15T00:00:00.000Z",
            eventEndAt: "2026-01-16T23:59:59.999Z",
            allDay: true
          })
        ]
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
      occurrences: [
        { ...baseOccurrence, eventStartAt: "2026-01-15T14:30:00.000Z", eventEndAt: "2026-01-16T09:15:00.000Z", allDay: false }
      ]
    });

    expect(update).toHaveBeenCalledWith(
      "id",
      expect.objectContaining({
        occurrences: [
          expect.objectContaining({
            eventStartAt: "2026-01-15T00:00:00.000Z",
            eventEndAt: "2026-01-16T23:59:59.999Z",
            allDay: true
          })
        ]
      })
    );
  });

  it("normalizes valid non-iso date strings before creating", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input }));
    const repo = createRepo(baseEvent, { create });

    await createEvent(repo, {
      ...baseEvent,
      occurrences: [
        {
          ...baseOccurrence,
          eventStartAt: "Thu, 15 Jan 2026 14:30:00 GMT",
          eventEndAt: "Fri, 16 Jan 2026 09:15:00 GMT",
          allDay: false
        }
      ]
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrences: [
          expect.objectContaining({
            eventStartAt: "2026-01-15T00:00:00.000Z",
            eventEndAt: "2026-01-16T23:59:59.999Z",
            allDay: true
          })
        ]
      })
    );
  });

  it("normalizes an occurrence with no start date to null dates", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input, occurrences: toStoredOccurrences(input.occurrences) }));
    const repo = createRepo(baseEvent, { create });

    await createEvent(repo, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, eventStartAt: null }]
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrences: [expect.objectContaining({ eventStartAt: null, eventEndAt: null, allDay: null })]
      })
    );
  });

  it("falls back to the start date when no end date is provided", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input, occurrences: toStoredOccurrences(input.occurrences) }));
    const repo = createRepo(baseEvent, { create });

    await createEvent(repo, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, eventStartAt: "2026-01-15T14:30:00.000Z", eventEndAt: null }]
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrences: [expect.objectContaining({ eventStartAt: "2026-01-15T00:00:00.000Z", eventEndAt: "2026-01-15T23:59:59.999Z", allDay: true })]
      })
    );
  });

  it("deletes previous image when updated", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      update: async () => ({ ...baseEvent, image: "/uploads/new.png" })
    });

    await updateEvent(repo, "id", baseEvent);

    expect(deleteUnreferencedLocalUploads).toHaveBeenCalledWith(
      [baseEvent.image, baseEvent.content],
      ["/uploads/new.png", baseEvent.content]
    );
  });

  it("updateEvent returns validation errors", async () => {
    const repo = createRepo(baseEvent);
    const result = await updateEvent(repo, "id", {});
    expect(result.ok).toBe(false);
  });

  it("updateEvent returns errors when geocoding fails", async () => {
    mockPhotonNotFound();
    const repo = createRepo(baseEvent, {
      update: async (_id, input) => ({ ...baseEvent, ...input, occurrences: toStoredOccurrences(input.occurrences) })
    });
    const result = await updateEvent(repo, "id", {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: undefined, longitude: undefined }]
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].latitude).toBeNull();
      expect(result.value.occurrences[0].longitude).toBeNull();
      expect(result.value.occurrences[0].geolocationPrecision).toBe("UNRESOLVED");
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
    const result = await publishEventForActor(repo, "missing", adminActor);
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

  it("archives a published event", async () => {
    const repo = createRepo({ ...baseEvent, status: "PUBLISHED" }, {
      archiveEvent: async () => ({ ...baseEvent, status: "PUBLISHED", archivedAt: "2026-02-01T00:00:00.000Z" })
    });
    const result = await archiveEvent(repo, "id");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.archivedAt).toBe("2026-02-01T00:00:00.000Z");
    }
  });

  it("returns not found when archiving a missing event", async () => {
    const repo = createRepo(null);
    const result = await archiveEvent(repo, "missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("rejects archiving a non-published event", async () => {
    const repo = createRepo(baseEvent);
    const result = await archiveEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Seuls les événements publiés peuvent être archivés.");
    }
  });

  it("returns not found when archive repository call fails", async () => {
    const repo = createRepo({ ...baseEvent, status: "PUBLISHED" }, {
      archiveEvent: async () => null
    });
    const result = await archiveEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("unarchives an event", async () => {
    const repo = createRepo(
      { ...baseEvent, status: "PUBLISHED", archivedAt: "2026-02-01T00:00:00.000Z" },
      { unarchiveEvent: async () => ({ ...baseEvent, status: "PUBLISHED", archivedAt: null }) }
    );
    const result = await unarchiveEvent(repo, "id");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.archivedAt).toBeNull();
    }
  });

  it("returns not found when unarchiving a missing event", async () => {
    const repo = createRepo(null);
    const result = await unarchiveEvent(repo, "missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Événement introuvable.");
    }
  });

  it("returns not found when unarchive repository call fails", async () => {
    const repo = createRepo(
      { ...baseEvent, status: "PUBLISHED", archivedAt: "2026-02-01T00:00:00.000Z" },
      { unarchiveEvent: async () => null }
    );
    const result = await unarchiveEvent(repo, "id");
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
    const result = await createEvent(repo, baseEvent, { id: "   ", role: "EDITOR" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le créateur est requis.");
    }
  });

  it("createEvent returns errors when geocoding fails", async () => {
    mockPhotonNotFound();
    const repo = createRepo(baseEvent, {
      create: async (input) => ({ ...fallbackEvent, ...input, occurrences: toStoredOccurrences(input.occurrences), id: "created" })
    });
    const result = await createEvent(repo, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: undefined, longitude: undefined }]
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].latitude).toBeNull();
      expect(result.value.occurrences[0].longitude).toBeNull();
      expect(result.value.occurrences[0].geolocationPrecision).toBe("UNRESOLVED");
    }
  });

  it("createEvent returns errors when geocoding throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const repo = createRepo(baseEvent, {
      create: async (input) => ({ ...fallbackEvent, ...input, occurrences: toStoredOccurrences(input.occurrences), id: "created" })
    });
    const result = await createEvent(repo, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: undefined, longitude: undefined }]
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].latitude).toBeNull();
      expect(result.value.occurrences[0].longitude).toBeNull();
      expect(result.value.occurrences[0].geolocationPrecision).toBe("UNRESOLVED");
    }
  });

  it("createEvent trusts manually supplied coordinates and skips geocoding", async () => {
    const repo = createRepo(baseEvent, {
      create: async (input) => ({ ...fallbackEvent, ...input, occurrences: toStoredOccurrences(input.occurrences), id: "created" })
    });

    const result = await createEvent(repo, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: 48.8566, longitude: 2.3522 }]
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].latitude).toBe(48.8566);
      expect(result.value.occurrences[0].longitude).toBe(2.3522);
      expect(result.value.occurrences[0].geolocationPrecision).toBe("EXACT");
    }
  });

  it("updateEvent trusts manually supplied coordinates and skips geocoding", async () => {
    const repo = createRepo(baseEvent, {
      update: async (_id, input) => ({ ...baseEvent, ...input, occurrences: toStoredOccurrences(input.occurrences) })
    });

    const result = await updateEvent(repo, "id", {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: 48.8566, longitude: 2.3522 }]
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].latitude).toBe(48.8566);
      expect(result.value.occurrences[0].longitude).toBe(2.3522);
      expect(result.value.occurrences[0].geolocationPrecision).toBe("EXACT");
    }
  });

  it("ignores a partial manual coordinate and falls back to geocoding", async () => {
    const repo = createRepo(baseEvent, {
      create: async (input) => ({ ...fallbackEvent, ...input, occurrences: toStoredOccurrences(input.occurrences), id: "created" })
    });

    const result = await createEvent(repo, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: 48.8566, longitude: undefined }]
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.occurrences[0].latitude).toBe(46.97);
      expect(result.value.occurrences[0].longitude).toBe(0.7);
    }
  });

  it("creates a title-only draft without dates or occurrences", async () => {
    const create = jest.fn(async (input) => ({ ...baseEvent, ...input }));
    const repo = createRepo(baseEvent, { create });

    const result = await createEvent(repo, { title: "Brouillon" });

    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ occurrences: [] }));
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
    const repo = createRepo({ ...baseEvent, occurrences: [{ ...baseOccurrence, geolocationPrecision: "APPROXIMATE" }] }, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, status: "PENDING" })
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("submitEvent treats legacy geolocated occurrences without explicit precision as exact", async () => {
    const legacyOccurrence: Partial<EventOccurrence> = { ...baseOccurrence };
    delete legacyOccurrence.geolocationPrecision;
    const repo = createRepo({ ...baseEvent, occurrences: [legacyOccurrence as EventOccurrence] }, {
      list: async () => [],
      updateStatus: async () => ({ ...baseEvent, status: "PENDING" })
    });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(true);
  });

  it("submitEvent blocks legacy unresolved occurrences without explicit precision", async () => {
    const legacyOccurrence: Partial<EventOccurrence> = { ...baseOccurrence, latitude: null, longitude: null };
    delete legacyOccurrence.geolocationPrecision;
    const repo = createRepo({ ...baseEvent, occurrences: [legacyOccurrence as EventOccurrence] });
    const result = await submitEvent(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("La localisation doit être corrigée avant la soumission à modération.");
    }
  });

  it("submitEvent blocks draft without resolved location", async () => {
    const repo = createRepo({ ...baseEvent, occurrences: [{ ...baseOccurrence, latitude: null, longitude: null }] });
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
        occurrences: [{ ...baseOccurrence, latitude: null, longitude: null }],
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
    const claimMock = jest.mocked(claimLocalUploads);
    const releaseMock = jest.mocked(releaseClaimedUploads);
    claimMock.mockResolvedValueOnce(["upload.webp"]);
    releaseMock.mockClear();
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
    expect(claimMock).toHaveBeenCalledWith([baseEvent.image, baseEvent.content]);
    expect(releaseMock).toHaveBeenCalledWith(["upload.webp"]);
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
    const result = await deleteEvent(repo, "missing", { role: "EDITOR", id: "owner-1" });
    expect(result.ok).toBe(false);
  });

  it("deleteEvent lets editors remove their own drafts", async () => {
    const repo = createRepo({ ...baseEvent, createdByUserId: "owner-1" });
    const result = await deleteEvent(repo, "id", { role: "EDITOR", id: "owner-1" });
    expect(result.ok).toBe(true);
    expect(deleteLocalUploads).toHaveBeenCalledWith([
      baseEvent.image,
      baseEvent.content,
      undefined,
      undefined
    ]);
  });

  it("deleteEvent forbids editors from removing published events", async () => {
    const repo = createRepo({
      ...baseEvent,
      createdByUserId: "owner-1",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    });
    const result = await deleteEvent(repo, "id", { role: "EDITOR", id: "owner-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Suppression non autorisée.");
    }
  });

  it("deleteEvent forbids editors from removing drafts they do not own", async () => {
    const repo = createRepo({ ...baseEvent, createdByUserId: "owner-2" });
    const result = await deleteEvent(repo, "id", { role: "EDITOR", id: "owner-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Action non autorisée.");
    }
  });

  it("deleteEvent lets administrators remove published events", async () => {
    const repo = createRepo({
      ...baseEvent,
      createdByUserId: "owner-1",
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z"
    });
    const result = await deleteEvent(repo, "id", adminActor);
    expect(result.ok).toBe(true);
  });

  it("deleteEvent returns not found when delete fails", async () => {
    const repo = createRepo(baseEvent, {
      list: async () => [],
      delete: async () => false
    });
    const result = await deleteEvent(repo, "id", adminActor);
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
          occurrences: toStoredOccurrences(input.occurrences),
          id: "revision-1",
          eventId: publishedEvent.id,
          createdByUserId: null,
          status,
          rejectionReason: null
        }
      })
    });

    const result = await updateEvent(repo, publishedEvent.id, {
      ...baseEvent,
      occurrences: [{ ...baseOccurrence, latitude: undefined, longitude: undefined }]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pendingRevision?.occurrences[0].latitude).toBeNull();
      expect(result.value.pendingRevision?.occurrences[0].longitude).toBeNull();
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

    expect(deleteUnreferencedLocalUploads).toHaveBeenCalledWith(
      ["/uploads/old-revision.png", baseEvent.content],
      ["/uploads/new-revision.png", baseEvent.content]
    );
  });

  it("preserves referenced pending revision assets on published update", async () => {
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

    expect(deleteUnreferencedLocalUploads).toHaveBeenCalledWith(
      ["/uploads/same-revision.png", baseEvent.content],
      ["/uploads/same-revision.png", baseEvent.content]
    );
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
    expect(deleteUnreferencedLocalUploads).toHaveBeenCalledWith(
      ["/uploads/original.png", baseEvent.content],
      ["/uploads/revision.png", baseEvent.content]
    );
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

  it("filters event reads according to ownership, publication and moderation state", async () => {
    const ownDraft = { ...baseEvent, id: "own", createdByUserId: "editor-1" };
    const foreignDraft = { ...baseEvent, id: "foreign", createdByUserId: "editor-2" };
    const published = { ...foreignDraft, id: "published", status: "PUBLISHED" as const };
    const pending = { ...foreignDraft, id: "pending", status: "PENDING" as const };
    const pendingRevision = {
      ...foreignDraft,
      id: "pending-revision",
      pendingRevision: {
        ...foreignDraft,
        id: "revision",
        eventId: "pending-revision",
        status: "PENDING" as const
      }
    };
    const repo = createRepo(null, {
      list: async () => [ownDraft, foreignDraft, published, pending, pendingRevision]
    });

    await expect(listEvents(repo, { id: "editor-1", role: "EDITOR" })).resolves.toEqual([ownDraft, published]);
    await expect(listEvents(repo, { id: "moderator-1", role: "MODERATOR" })).resolves.toEqual([
      published,
      pending,
      pendingRevision
    ]);
    await expect(listEvents(repo, adminActor)).resolves.toHaveLength(5);
  });

  it("authorizes individual reads without leaking a foreign draft", async () => {
    const foreignDraft = { ...baseEvent, createdByUserId: "editor-2" };
    const repo = createRepo(foreignDraft);

    const denied = await getEventForActor(repo, "id", { id: "editor-1", role: "EDITOR" });
    expect(denied).toEqual({ ok: false, errors: ["Action non autorisée."], status: 403 });

    const ownerRead = await getEventForActor(repo, "id", { id: "editor-2", role: "EDITOR" });
    expect(ownerRead).toEqual({ ok: true, value: foreignDraft });

    await expect(getEventForActor(createRepo(null), "missing", adminActor)).resolves.toEqual({
      ok: false,
      errors: ["Événement introuvable."],
      status: 404
    });
  });

  it("enforces the vertical role boundary on privileged event actions", async () => {
    const repo = createRepo({ ...baseEvent, createdByUserId: "editor-1" });
    const editor = { id: "editor-1", role: "EDITOR" as const };
    const moderator = { id: "moderator-1", role: "MODERATOR" as const };

    await expect(publishEvent(repo, "id", false, editor)).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(rejectEvent(repo, "id", "Motif", editor)).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(updateEventFeatured(repo, "id", true, moderator)).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(archiveEvent(repo, "id", moderator)).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(unarchiveEvent(repo, "id", moderator)).resolves.toMatchObject({ ok: false, status: 403 });
    await expect(updateEvent(repo, "id", baseEvent, moderator)).resolves.toMatchObject({ ok: false, status: 403 });
  });
});
