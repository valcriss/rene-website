import { EventRepository } from "./repository";
import { validateCreateEvent } from "./validation";
import { Event, EventDraftInput } from "./types";
import { geocodeEventLocation } from "../geocoding/photon";
import { deleteUploadIfLocal } from "../uploads/storage";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const resolveCoordinates = async (
  input: EventDraftInput
): Promise<ServiceResult<{ latitude: number; longitude: number }>> => {
  try {
    const result = await geocodeEventLocation({
      address: input.address,
      venueName: input.venueName,
      postalCode: input.postalCode,
      city: input.city
    });
    if (!result) {
      return { ok: false, errors: ["Adresse introuvable."] };
    }
    return { ok: true, value: result };
  } catch {
    return { ok: false, errors: ["Le service de géolocalisation est indisponible."] };
  }
};

export const listEvents = (repo: EventRepository): Promise<Event[]> => repo.list();

export const getEvent = (repo: EventRepository, id: string): Promise<Event | null> => repo.getById(id);

export const createEvent = async (
  repo: EventRepository,
  input: unknown
): Promise<ServiceResult<Event>> => {
  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const coordinates = await resolveCoordinates(validation.value);
  if (!coordinates.ok) {
    return { ok: false, errors: coordinates.errors };
  }

  try {
    const created = await repo.create({
      ...validation.value,
      latitude: coordinates.value.latitude,
      longitude: coordinates.value.longitude
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

  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const coordinates = await resolveCoordinates(validation.value);
  if (!coordinates.ok) {
    return { ok: false, errors: coordinates.errors };
  }

  try {
    const updated = await repo.update(id, {
      ...validation.value,
      latitude: coordinates.value.latitude,
      longitude: coordinates.value.longitude
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
  id: string
): Promise<ServiceResult<Event>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }
  const now = new Date().toISOString();
  const updated = await repo.updateStatus(id, "PUBLISHED", {
    publishedAt: now,
    rejectionReason: null,
    publicationEndAt: current.publicationEndAt
  });
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
  id: string
): Promise<ServiceResult<{ id: string }>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Événement introuvable."] };
  }

  const deleted = await repo.delete(id);
  if (!deleted) {
    return { ok: false, errors: ["Événement introuvable."] };
  }

  await deleteUploadIfLocal(current.image);
  return { ok: true, value: { id } };
};
