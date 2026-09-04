import { EventRepository } from "./repository";
import { validateCreateEvent, validateEventCompleteness } from "./validation";
import { Event, EventOccurrenceInput, GeolocationPrecision } from "./types";
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

const normalizeOccurrenceDates = (occurrence: EventOccurrenceInput): EventOccurrenceInput => {
  const rawStart = occurrence.eventStartAt;
  const rawEnd = occurrence.eventEndAt || occurrence.eventStartAt;
  if (!rawStart || !rawEnd) {
    return { ...occurrence, eventStartAt: null, eventEndAt: null, allDay: null };
  }

  const startDate = extractIsoDate(rawStart);
  const endDate = extractIsoDate(rawEnd);

  return {
    ...occurrence,
    eventStartAt: `${startDate}T00:00:00.000Z`,
    eventEndAt: `${endDate}T23:59:59.999Z`,
    allDay: true
  };
};

const hasResolvedCoordinates = (occurrence: Pick<EventOccurrenceInput, "latitude" | "longitude">) =>
  typeof occurrence.latitude === "number" &&
  Number.isFinite(occurrence.latitude) &&
  typeof occurrence.longitude === "number" &&
  Number.isFinite(occurrence.longitude);

const getGeolocationPrecision = (
  occurrence: Pick<EventOccurrenceInput, "latitude" | "longitude" | "geolocationPrecision">
): GeolocationPrecision =>
  occurrence.geolocationPrecision ?? (hasResolvedCoordinates(occurrence) ? "EXACT" : "UNRESOLVED");

const isOccurrenceGeolocated = (
  occurrence: Pick<EventOccurrenceInput, "latitude" | "longitude" | "geolocationPrecision">
) => getGeolocationPrecision(occurrence) !== "UNRESOLVED" && hasResolvedCoordinates(occurrence);

const isCompleteOccurrence = (occurrence: Pick<EventOccurrenceInput, "city" | "eventStartAt" | "eventEndAt" | "allDay">) =>
  Boolean(occurrence.city?.trim()) &&
  Boolean(occurrence.eventStartAt?.trim()) &&
  Boolean(occurrence.eventEndAt?.trim()) &&
  typeof occurrence.allDay === "boolean";

// Every occurrence the editor actually filled in (has a city) must be geolocated before the event
// can move to moderation — occurrences left entirely blank don't count against this.
const hasSubmittableGeolocation = (occurrences: EventOccurrenceInput[]) => {
  const complete = occurrences.filter(isCompleteOccurrence);
  return complete.length > 0 && complete.every(isOccurrenceGeolocated);
};

const hasManualCoordinates = (occurrence: EventOccurrenceInput) =>
  typeof occurrence.latitude === "number" &&
  Number.isFinite(occurrence.latitude) &&
  typeof occurrence.longitude === "number" &&
  Number.isFinite(occurrence.longitude);

const geocodeCoordinates = async (
  occurrence: EventOccurrenceInput
): Promise<{ latitude: number; longitude: number; geolocationPrecision: GeolocationPrecision } | null> => {
  try {
    return await geocodeEventLocation({
      address: occurrence.address,
      venueName: occurrence.venueName,
      postalCode: occurrence.postalCode,
      city: occurrence.city
    });
  } catch {
    return null;
  }
};

// An occurrence that supplies both latitude and longitude is a manual correction — it takes
// precedence over automatic geocoding and is trusted as-is (EXACT), instead of being silently
// overwritten by it.
const resolveOccurrenceCoordinates = async (occurrence: EventOccurrenceInput): Promise<EventOccurrenceInput> => {
  if (hasManualCoordinates(occurrence)) {
    return { ...occurrence, geolocationPrecision: "EXACT" };
  }

  const geocoded = await geocodeCoordinates(occurrence);
  return {
    ...occurrence,
    latitude: geocoded?.latitude ?? null,
    longitude: geocoded?.longitude ?? null,
    geolocationPrecision: geocoded?.geolocationPrecision ?? "UNRESOLVED"
  };
};

const prepareOccurrences = async (occurrences: EventOccurrenceInput[]): Promise<EventOccurrenceInput[]> =>
  Promise.all(occurrences.map(normalizeOccurrenceDates).map(resolveOccurrenceCoordinates));

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

  const occurrences = await prepareOccurrences(validation.value.occurrences);

  try {
    const created = await repo.create({
      ...validation.value,
      occurrences,
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

  const occurrences = await prepareOccurrences(validation.value.occurrences);

  try {
    if (current.status === "PUBLISHED") {
      const updated = await repo.upsertPendingRevision(id, {
        ...validation.value,
        occurrences,
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
      ...validation.value,
      occurrences,
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
    if (!hasSubmittableGeolocation(current.pendingRevision.occurrences)) {
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

  if (!hasSubmittableGeolocation(current.occurrences)) {
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
