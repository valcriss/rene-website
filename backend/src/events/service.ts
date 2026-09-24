import { EventRepository } from "./repository";
import { validateCreateEvent, validateEventCompleteness } from "./validation";
import { Event, EventOccurrenceInput, GeolocationPrecision, PublicEvent } from "./types";
import { geocodeEventLocation } from "../geocoding/photon";
import { generateUniqueEventSlug } from "./slug";
import {
  claimLocalUploads,
  deleteLocalUploads,
  deleteUnreferencedLocalUploads,
  releaseClaimedUploads
} from "../uploads/storage";
import { AuthenticatedActor } from "../auth/types";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[]; status: 400 | 403 | 404 };

const missingCoordinatesError = "La localisation doit être corrigée avant la soumission à modération.";
const pendingEditionError = "L'événement ne peut pas être modifié tant qu'il est en attente de modération.";
const invalidFeaturedError = "La mise en avant doit être un booléen.";
const deleteForbiddenError = "Suppression non autorisée.";
const forbiddenError = "Action non autorisée.";
const notFoundError = "Événement introuvable.";
const invalidSlugError = "Le slug doit être en minuscules, alphanumérique, séparé par des tirets.";
const slugTakenError = "Ce slug est déjà utilisé par un autre événement.";
const unpublishedSlugError = "Seuls les événements publiés peuvent avoir un slug personnalisé.";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type EventActor = AuthenticatedActor;

const badRequest = <T>(errors: string[]): ServiceResult<T> => ({ ok: false, errors, status: 400 });
const forbidden = <T>(message = forbiddenError): ServiceResult<T> => ({ ok: false, errors: [message], status: 403 });
const notFound = <T>(message = notFoundError): ServiceResult<T> => ({ ok: false, errors: [message], status: 404 });

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

const isPendingModeration = (event: Event) =>
  event.status === "PENDING" || event.pendingRevision?.status === "PENDING";

export const canReadEvent = (event: Event, actor: EventActor) =>
  actor.role === "ADMIN" ||
  event.createdByUserId === actor.id ||
  event.status === "PUBLISHED" ||
  (actor.role === "MODERATOR" && isPendingModeration(event));

export const listEvents = async (repo: EventRepository, actor?: EventActor): Promise<Event[]> => {
  const events = await repo.list();
  return actor ? events.filter((event) => canReadEvent(event, actor)) : events;
};

export const getEvent = (repo: EventRepository, id: string): Promise<Event | null> => repo.getById(id);

// An event is safe to show to an anonymous visitor once it is published and has not been
// withdrawn from public view; archiving an event pulls it back out of the public API.
const isPubliclyVisible = (event: Event) => event.status === "PUBLISHED" && !event.archivedAt;

const toPublicEvent = (event: Event): PublicEvent => ({
  id: event.id,
  title: event.title,
  content: event.content,
  image: event.image,
  imageAlt: event.imageAlt,
  seoTitleOverride: event.seoTitleOverride,
  seoDescriptionOverride: event.seoDescriptionOverride,
  categoryId: event.categoryId,
  audienceId: event.audienceId,
  occurrences: event.occurrences,
  organizerName: event.organizerName,
  organizerUrl: event.organizerUrl,
  contactEmail: event.contactEmail,
  contactPhone: event.contactPhone,
  ticketUrl: event.ticketUrl,
  pricingInfo: event.pricingInfo,
  websiteUrl: event.websiteUrl,
  socialLinks: event.socialLinks,
  slug: event.slug,
  featured: event.featured,
  status: event.status,
  publishedAt: event.publishedAt,
  publicationEndAt: event.publicationEndAt,
  archivedAt: event.archivedAt,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt
});

export const listPublicEvents = async (repo: EventRepository): Promise<PublicEvent[]> => {
  const events = await repo.list();
  return events.filter(isPubliclyVisible).map(toPublicEvent);
};

export const getPublicEvent = async (repo: EventRepository, id: string): Promise<PublicEvent | null> => {
  const event = await repo.getById(id);
  if (!event || !isPubliclyVisible(event)) {
    return null;
  }
  return toPublicEvent(event);
};

export type PublicEventPageStatus = 200 | 404 | 410;

// An event page is 410 only when it was intentionally and durably withdrawn (archivedAt set).
// An event that merely reached the end of its occurrences (publicationEndAt elapsed) stays a
// live, indexable 200 — it is still useful as a past record linking to upcoming events.
export const getPublicEventPageStatus = async (
  repo: EventRepository,
  id: string
): Promise<PublicEventPageStatus> => {
  const event = await repo.getById(id);
  if (!event || event.status !== "PUBLISHED") {
    return 404;
  }
  return event.archivedAt ? 410 : 200;
};

// Same rule as getPublicEventPageStatus, resolved by canonical slug instead of id — used for the
// public /evenements/:slug route.
export const getPublicEventPageStatusBySlug = async (
  repo: EventRepository,
  slug: string
): Promise<PublicEventPageStatus> => {
  const event = await repo.findBySlug(slug);
  if (!event || event.status !== "PUBLISHED") {
    return 404;
  }
  return event.archivedAt ? 410 : 200;
};

export const getEventForActor = async (
  repo: EventRepository,
  id: string,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  const event = await repo.getById(id);
  if (!event) {
    return notFound();
  }

  return canReadEvent(event, actor) ? { ok: true, value: event } : forbidden();
};

const canEditEvent = (event: Event, actor: EventActor) =>
  actor.role === "ADMIN" || event.createdByUserId === actor.id;

const getEventForOwnedMutation = async (
  repo: EventRepository,
  id: string,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  const event = await repo.getById(id);
  if (!event) {
    return actor.role === "ADMIN" ? notFound() : forbidden();
  }

  return canEditEvent(event, actor) ? { ok: true, value: event } : forbidden();
};

export const createEvent = async (
  repo: EventRepository,
  input: unknown,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  if (actor.id.trim().length === 0) {
    return badRequest(["Le créateur est requis."]);
  }
  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return badRequest(validation.errors);
  }

  const occurrences = await prepareOccurrences(validation.value.occurrences);
  let claimedUploads: string[] = [];

  try {
    claimedUploads = await claimLocalUploads([validation.value.image, validation.value.content]);
    const created = await repo.create({
      ...validation.value,
      occurrences,
      createdByUserId: actor.id
    });
    return { ok: true, value: created };
  } catch (error) {
    await releaseClaimedUploads(claimedUploads);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return badRequest([message]);
  }
};

export const updateEvent = async (
  repo: EventRepository,
  id: string,
  input: unknown,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  const access = await getEventForOwnedMutation(repo, id, actor);
  if (!access.ok) {
    return access;
  }
  const current = access.value;
  if (current.status === "PENDING" || current.pendingRevision?.status === "PENDING") {
    return badRequest([pendingEditionError]);
  }

  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return badRequest(validation.errors);
  }

  const occurrences = await prepareOccurrences(validation.value.occurrences);
  let claimedUploads: string[] = [];

  try {
    claimedUploads = await claimLocalUploads([validation.value.image, validation.value.content]);
    if (current.status === "PUBLISHED") {
      const updated = await repo.upsertPendingRevision(id, {
        ...validation.value,
        occurrences,
        featured: current.pendingRevision?.featured ?? false,
        createdByUserId: current.createdByUserId
      }, "DRAFT");
      if (!updated) {
        await releaseClaimedUploads(claimedUploads);
        return notFound();
      }
      if (current.pendingRevision) {
        await deleteUnreferencedLocalUploads(
          [current.pendingRevision.image, current.pendingRevision.content],
          [updated.pendingRevision?.image, updated.pendingRevision?.content]
        );
      }
      return { ok: true, value: updated };
    }

    const updated = await repo.update(id, {
      ...validation.value,
      occurrences,
      featured: current.featured
    });
    if (!updated) {
      await releaseClaimedUploads(claimedUploads);
      return notFound();
    }
    await deleteUnreferencedLocalUploads([current.image, current.content], [updated.image, updated.content]);
    return { ok: true, value: updated };
  } catch (error) {
    await releaseClaimedUploads(claimedUploads);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return badRequest([message]);
  }
};

export const submitEvent = async (
  repo: EventRepository,
  id: string,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  const access = await getEventForOwnedMutation(repo, id, actor);
  if (!access.ok) {
    return access;
  }
  const current = access.value;
  if (current.status === "PUBLISHED") {
    if (!current.pendingRevision) {
      return notFound("Révision introuvable.");
    }
    const completenessErrors = validateEventCompleteness(current.pendingRevision);
    if (completenessErrors.length > 0) {
      return badRequest(completenessErrors);
    }
    if (!hasSubmittableGeolocation(current.pendingRevision.occurrences)) {
      return badRequest([missingCoordinatesError]);
    }
    if (current.pendingRevision.status === "PENDING") {
      return { ok: true, value: current };
    }
    const updatedRevision = await repo.submitPendingRevision(id);
    if (!updatedRevision) {
      return notFound("Révision introuvable.");
    }
    return { ok: true, value: updatedRevision };
  }

  const completenessErrors = validateEventCompleteness(current);
  if (completenessErrors.length > 0) {
    return badRequest(completenessErrors);
  }

  if (!hasSubmittableGeolocation(current.occurrences)) {
    return badRequest([missingCoordinatesError]);
  }

  const updated = await repo.updateStatus(id, "PENDING", {
    publishedAt: null,
    rejectionReason: null,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return notFound();
  }
  return { ok: true, value: updated };
};

export const publishEvent = async (
  repo: EventRepository,
  id: string,
  actor: EventActor,
  featured: unknown = false
): Promise<ServiceResult<Event>> => {
  if (actor.role !== "MODERATOR" && actor.role !== "ADMIN") {
    return forbidden();
  }
  if (typeof featured !== "boolean") {
    return badRequest([invalidFeaturedError]);
  }
  const current = await repo.getById(id);
  if (!current) {
    return notFound();
  }
  const now = new Date().toISOString();
  if (current.status === "PUBLISHED") {
    if (!current.pendingRevision) {
      return notFound("Révision introuvable.");
    }
    if (current.pendingRevision.status !== "PENDING") {
      return badRequest(["Révision non soumise."]);
    }
    const updatedRevision = await repo.publishPendingRevision(id, now, actor.id);
    if (!updatedRevision) {
      return notFound("Révision introuvable.");
    }
    await deleteUnreferencedLocalUploads(
      [current.image, current.content],
      [updatedRevision.image, updatedRevision.content]
    );
    return { ok: true, value: updatedRevision };
  }

  const updated = await repo.updateStatus(id, "PUBLISHED", {
    featured,
    publishedAt: now,
    publishedByUserId: actor.id,
    rejectionReason: null,
    rejectedByUserId: null,
    rejectedAt: null,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return notFound();
  }

  // The slug is generated once, at first publication, and never touched again by a later edit —
  // only an explicit slug change (updateEventSlug) may move it.
  if (!updated.slug) {
    const slug = await generateUniqueEventSlug(repo, updated.title, updated.occurrences);
    const withSlug = await repo.setSlug(id, slug);
    if (withSlug) {
      return { ok: true, value: withSlug };
    }
  }
  return { ok: true, value: updated };
};

export const updateEventFeatured = async (
  repo: EventRepository,
  id: string,
  featured: unknown,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  if (actor.role !== "ADMIN") {
    return forbidden();
  }
  if (typeof featured !== "boolean") {
    return badRequest([invalidFeaturedError]);
  }

  const current = await repo.getById(id);
  if (!current) {
    return notFound();
  }
  if (current.status !== "PUBLISHED") {
    return badRequest(["Seuls les événements publiés peuvent être mis en avant."]);
  }

  const updated = await repo.updateFeatured(id, featured);
  if (!updated) {
    return notFound();
  }

  return { ok: true, value: updated };
};

// An explicit, admin-triggered slug change — distinct from the automatic first-publication slug
// and from ordinary title edits, which never touch the slug. The previous slug is archived into
// the redirect history so old links keep resolving.
export const updateEventSlug = async (
  repo: EventRepository,
  id: string,
  slug: unknown,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  if (actor.role !== "ADMIN") {
    return forbidden();
  }
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return badRequest([invalidSlugError]);
  }

  const current = await repo.getById(id);
  if (!current) {
    return notFound();
  }
  if (current.status !== "PUBLISHED") {
    return badRequest([unpublishedSlugError]);
  }

  if (slug !== current.slug) {
    const existingOwner = await repo.findBySlug(slug);
    if (existingOwner && existingOwner.id !== id) {
      return badRequest([slugTakenError]);
    }
  }

  const updated = await repo.setSlug(id, slug);
  if (!updated) {
    return notFound();
  }
  return { ok: true, value: updated };
};

export const archiveEvent = async (
  repo: EventRepository,
  id: string,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  if (actor.role !== "ADMIN") {
    return forbidden();
  }
  const current = await repo.getById(id);
  if (!current) {
    return notFound();
  }
  if (current.status !== "PUBLISHED") {
    return badRequest(["Seuls les événements publiés peuvent être archivés."]);
  }

  const updated = await repo.archiveEvent(id, new Date().toISOString());
  if (!updated) {
    return notFound();
  }
  return { ok: true, value: updated };
};

export const unarchiveEvent = async (
  repo: EventRepository,
  id: string,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  if (actor.role !== "ADMIN") {
    return forbidden();
  }
  const current = await repo.getById(id);
  if (!current) {
    return notFound();
  }

  const updated = await repo.unarchiveEvent(id);
  if (!updated) {
    return notFound();
  }
  return { ok: true, value: updated };
};

export const rejectEvent = async (
  repo: EventRepository,
  id: string,
  reason: unknown,
  actor: EventActor
): Promise<ServiceResult<Event>> => {
  if (actor.role !== "MODERATOR" && actor.role !== "ADMIN") {
    return forbidden();
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return badRequest(["Le motif de refus est requis."]);
  }
  const current = await repo.getById(id);
  if (!current) {
    return notFound();
  }
  if (current.status === "PUBLISHED") {
    if (!current.pendingRevision) {
      return notFound("Révision introuvable.");
    }
    if (current.pendingRevision.status !== "PENDING") {
      return badRequest(["Révision non soumise."]);
    }
    const updatedRevision = await repo.rejectPendingRevision(id, reason);
    if (!updatedRevision) {
      return notFound("Révision introuvable.");
    }
    return { ok: true, value: updatedRevision };
  }

  const updated = await repo.updateStatus(id, "REJECTED", {
    publishedAt: null,
    publishedByUserId: null,
    rejectionReason: reason,
    rejectedByUserId: actor.id,
    rejectedAt: new Date().toISOString(),
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return notFound();
  }
  return { ok: true, value: updated };
};

export const deleteEvent = async (
  repo: EventRepository,
  id: string,
  actor: EventActor
): Promise<ServiceResult<{ id: string }>> => {
  const access = await getEventForOwnedMutation(repo, id, actor);
  if (!access.ok) {
    return access;
  }
  const current = access.value;

  if (actor.role !== "ADMIN" && current.status !== "DRAFT") {
    return forbidden(deleteForbiddenError);
  }

  const deleted = await repo.delete(id);
  if (!deleted) {
    return notFound();
  }

  await deleteLocalUploads([
    current.image,
    current.content,
    current.pendingRevision?.image,
    current.pendingRevision?.content
  ]);
  return { ok: true, value: { id } };
};
