import { EventRepository } from "./repository";
import { validateCreateEvent, validateEventCompleteness } from "./validation";
import { Event, EventDraftInput, GeolocationPrecision } from "./types";
import { geocodeEventLocation } from "../geocoding/photon";
import { deleteUploadIfLocal } from "../uploads/storage";
import { UserRole } from "../auth/roles";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const missingCoordinatesError = "La localisation doit être corrigée avant la soumission à modération.";
const pendingEditionError = "L'événement ne peut pas être modifié tant qu'il est en attente de modération.";
const invalidFeaturedError = "La mise en avant doit être un booléen.";
const deleteForbiddenError = "Suppression non autorisée.";

type DeleteActor = {
  role: UserRole;
  userId: string | null;
};

const extractIsoDate = (value: string) => {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const date = new Date(value);

  const pad = (part: number) => part.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const normalizeEventDates = (input: EventDraftInput): EventDraftInput => {
  const rawStart = input.eventStartAt;
  const rawEnd = input.eventEndAt || input.eventStartAt;
  if (!rawStart || !rawEnd) {
    return { ...input, eventStartAt: null, eventEndAt: null, allDay: null };
  }

  const startDate = extractIsoDate(rawStart);
  const endDate = extractIsoDate(rawEnd);

  return {
    ...input,
    eventStartAt: `${startDate}T00:00:00.000Z`,
    eventEndAt: `${endDate}T23:59:59.999Z`,
    allDay: true
  };
};

const hasResolvedCoordinates = (event: Pick<Event, "latitude" | "longitude">) =>
  typeof event.latitude === "number" &&
  Number.isFinite(event.latitude) &&
  typeof event.longitude === "number" &&
  Number.isFinite(event.longitude);

const getGeolocationPrecision = (
  event: Pick<Event, "latitude" | "longitude" | "geolocationPrecision">
): GeolocationPrecision => event.geolocationPrecision ?? (hasResolvedCoordinates(event) ? "EXACT" : "UNRESOLVED");

const hasSubmittableGeolocation = (
  event: Pick<Event, "latitude" | "longitude" | "geolocationPrecision">
) => getGeolocationPrecision(event) !== "UNRESOLVED" && hasResolvedCoordinates(event);

const hasManualCoordinates = (input: EventDraftInput) =>
  typeof input.latitude === "number" &&
  Number.isFinite(input.latitude) &&
  typeof input.longitude === "number" &&
  Number.isFinite(input.longitude);

const geocodeCoordinates = async (
  input: EventDraftInput
): Promise<{ latitude: number; longitude: number; geolocationPrecision: GeolocationPrecision } | null> => {
  try {
    const result = await geocodeEventLocation({
      address: input.address,
      venueName: input.venueName,
      postalCode: input.postalCode,
      city: input.city
    });
    return result;
  } catch {
    return null;
  }
};

// A request that supplies both latitude and longitude is a manual correction — it takes precedence
// over automatic geocoding and is trusted as-is (EXACT), instead of being silently overwritten by it.
const resolveCoordinates = async (
  input: EventDraftInput
): Promise<{ latitude: number; longitude: number; geolocationPrecision: GeolocationPrecision } | null> => {
  if (hasManualCoordinates(input)) {
    return { latitude: input.latitude as number, longitude: input.longitude as number, geolocationPrecision: "EXACT" };
  }

  return geocodeCoordinates(input);
};

export const listEvents = (repo: EventRepository): Promise<Event[]> => repo.list();

export const getEvent = (repo: EventRepository, id: string): Promise<Event | null> => repo.getById(id);

const canDeleteEvent = (event: Event, actor: DeleteActor) => {
  if (actor.role === "ADMIN" || actor.role === "MODERATOR") {
    return true;
  }

  return actor.userId !== null && event.status === "DRAFT" && event.createdByUserId === actor.userId;
};

export const createEvent = async (
  repo: EventRepository,
  input: unknown,
  createdByUserId?: string | null
): Promise<ServiceResult<Event>> => {
  if (createdByUserId !== undefined && createdByUserId !== null && createdByUserId.trim().length === 0) {
    return { ok: false, errors: ["Le créateur est requis."] };
  }
  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const normalizedInput = normalizeEventDates(validation.value);

  const coordinates = await resolveCoordinates(normalizedInput);

  try {
    const created = await repo.create({
      ...validation.value,
      ...normalizedInput,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      geolocationPrecision: coordinates?.geolocationPrecision ?? "UNRESOLVED",
      createdByUserId: createdByUserId ?? null
    });
    return { ok: true, value: created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { ok: false, errors: [message] };
  }
};

export const updateEvent = async (
  repo: EventRepository,
  id: string,
  input: unknown
): Promise<ServiceResult<Event>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  if (current.status === "PENDING" || current.pendingRevision?.status === "PENDING") {
    return { ok: false, errors: [pendingEditionError] };
  }

  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const normalizedInput = normalizeEventDates(validation.value);

  const coordinates = await resolveCoordinates(normalizedInput);

  try {
    if (current.status === "PUBLISHED") {
      const updated = await repo.upsertPendingRevision(id, {
        ...normalizedInput,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        geolocationPrecision: coordinates?.geolocationPrecision ?? "UNRESOLVED",
        featured: current.pendingRevision?.featured ?? false,
        createdByUserId: current.createdByUserId
      }, "DRAFT");
      if (!updated) {
        return { ok: false, errors: ["Événement introuvable."] };
      }
      if (current.pendingRevision && current.pendingRevision.image !== updated.pendingRevision?.image) {
        await deleteUploadIfLocal(current.pendingRevision.image);
      }
      return { ok: true, value: updated };
    }

    const updated = await repo.update(id, {
      ...normalizedInput,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      geolocationPrecision: coordinates?.geolocationPrecision ?? "UNRESOLVED",
      featured: current.featured
    });
    if (!updated) {
      return { ok: false, errors: ["Événement introuvable."] };
    }
    if (current.image !== updated.image) {
      await deleteUploadIfLocal(current.image);
    }
    return { ok: true, value: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { ok: false, errors: [message] };
  }
};

export const submitEvent = async (
  repo: EventRepository,
  id: string
): Promise<ServiceResult<Event>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  if (current.status === "PUBLISHED") {
    if (!current.pendingRevision) {
      return { ok: false, errors: ["Révision introuvable."] };
    }
    const completenessErrors = validateEventCompleteness(current.pendingRevision);
    if (completenessErrors.length > 0) {
      return { ok: false, errors: completenessErrors };
    }
    if (!hasSubmittableGeolocation(current.pendingRevision)) {
      return { ok: false, errors: [missingCoordinatesError] };
    }
    if (current.pendingRevision.status === "PENDING") {
      return { ok: true, value: current };
    }
    const updatedRevision = await repo.submitPendingRevision(id);
    if (!updatedRevision) {
      return { ok: false, errors: ["Révision introuvable."] };
    }
    return { ok: true, value: updatedRevision };
  }

  const completenessErrors = validateEventCompleteness(current);
  if (completenessErrors.length > 0) {
    return { ok: false, errors: completenessErrors };
  }

  if (!hasSubmittableGeolocation(current)) {
    return { ok: false, errors: [missingCoordinatesError] };
  }

  const updated = await repo.updateStatus(id, "PENDING", {
    publishedAt: null,
    rejectionReason: null,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  return { ok: true, value: updated };
};

export const publishEvent = async (
  repo: EventRepository,
  id: string,
  featured: unknown = false
): Promise<ServiceResult<Event>> => {
  if (typeof featured !== "boolean") {
    return { ok: false, errors: [invalidFeaturedError] };
  }
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  const now = new Date().toISOString();
  if (current.status === "PUBLISHED") {
    if (!current.pendingRevision) {
      return { ok: false, errors: ["Révision introuvable."] };
    }
    if (current.pendingRevision.status !== "PENDING") {
      return { ok: false, errors: ["Révision non soumise."] };
    }
    const updatedRevision = await repo.publishPendingRevision(id, now);
    if (!updatedRevision) {
      return { ok: false, errors: ["Révision introuvable."] };
    }
    if (current.image !== updatedRevision.image) {
      await deleteUploadIfLocal(current.image);
    }
    return { ok: true, value: updatedRevision };
  }

  const updated = await repo.updateStatus(id, "PUBLISHED", {
    featured,
    publishedAt: now,
    rejectionReason: null,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  return { ok: true, value: updated };
};

export const updateEventFeatured = async (
  repo: EventRepository,
  id: string,
  featured: unknown
): Promise<ServiceResult<Event>> => {
  if (typeof featured !== "boolean") {
    return { ok: false, errors: [invalidFeaturedError] };
  }

  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  if (current.status !== "PUBLISHED") {
    return { ok: false, errors: ["Seuls les événements publiés peuvent être mis en avant."] };
  }

  const updated = await repo.updateFeatured(id, featured);
  if (!updated) {
    return { ok: false, errors: ["Événement introuvable."] };
  }

  return { ok: true, value: updated };
};

export const rejectEvent = async (
  repo: EventRepository,
  id: string,
  reason: unknown
): Promise<ServiceResult<Event>> => {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return { ok: false, errors: ["Le motif de refus est requis."] };
  }
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  if (current.status === "PUBLISHED") {
    if (!current.pendingRevision) {
      return { ok: false, errors: ["Révision introuvable."] };
    }
    if (current.pendingRevision.status !== "PENDING") {
      return { ok: false, errors: ["Révision non soumise."] };
    }
    const updatedRevision = await repo.rejectPendingRevision(id, reason);
    if (!updatedRevision) {
      return { ok: false, errors: ["Révision introuvable."] };
    }
    return { ok: true, value: updatedRevision };
  }

  const updated = await repo.updateStatus(id, "REJECTED", {
    publishedAt: null,
    rejectionReason: reason,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  return { ok: true, value: updated };
};

export const deleteEvent = async (
  repo: EventRepository,
  id: string,
  actor: DeleteActor
): Promise<ServiceResult<{ id: string }>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }

  if (!canDeleteEvent(current, actor)) {
    return { ok: false, errors: [deleteForbiddenError] };
  }

  const deleted = await repo.delete(id);
  if (!deleted) {
    return { ok: false, errors: ["Événement introuvable."] };
  }

  await deleteUploadIfLocal(current.image);
  return { ok: true, value: { id } };
};
