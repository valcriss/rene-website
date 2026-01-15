import { EventRepository } from "./repository";
import { validateCreateEvent } from "./validation";
import { Event } from "./types";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

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

  const created = await repo.create(validation.value);
  return { ok: true, value: created };
};

export const updateEvent = async (
  repo: EventRepository,
  id: string,
  input: unknown
): Promise<ServiceResult<Event>> => {
  const validation = validateCreateEvent(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const updated = await repo.update(id, validation.value);
  if (!updated) {
    return { ok: false, errors: ["Event not found"] };
  }
  return { ok: true, value: updated };
};

export const submitEvent = async (
  repo: EventRepository,
  id: string
): Promise<ServiceResult<Event>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Event not found"] };
  }
  const updated = await repo.updateStatus(id, "PENDING", {
    publishedAt: null,
    rejectionReason: null,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return { ok: false, errors: ["Event not found"] };
  }
  return { ok: true, value: updated };
};

export const publishEvent = async (
  repo: EventRepository,
  id: string
): Promise<ServiceResult<Event>> => {
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Event not found"] };
  }
  const now = new Date().toISOString();
  const updated = await repo.updateStatus(id, "PUBLISHED", {
    publishedAt: now,
    rejectionReason: null,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return { ok: false, errors: ["Event not found"] };
  }
  return { ok: true, value: updated };
};

export const rejectEvent = async (
  repo: EventRepository,
  id: string,
  reason: unknown
): Promise<ServiceResult<Event>> => {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return { ok: false, errors: ["rejectionReason is required"] };
  }
  const current = await repo.getById(id);
  if (!current) {
    return { ok: false, errors: ["Event not found"] };
  }
  const updated = await repo.updateStatus(id, "REJECTED", {
    publishedAt: null,
    rejectionReason: reason,
    publicationEndAt: current.publicationEndAt
  });
  if (!updated) {
    return { ok: false, errors: ["Event not found"] };
  }
  return { ok: true, value: updated };
};
