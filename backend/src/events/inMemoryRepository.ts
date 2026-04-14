import { randomUUID } from "node:crypto";
import { EventRepository } from "./repository";
import { CreateEventInput, Event, EventRevision, EventRevisionStatus } from "./types";

export const createInMemoryEventRepository = (): EventRepository => {
  const events = new Map<string, Event>();

  const buildRevision = (
    eventId: string,
    input: CreateEventInput,
    status: EventRevisionStatus,
    existing?: EventRevision | null
  ): EventRevision => {
    const now = new Date().toISOString();
    return {
      ...input,
      id: existing?.id ?? randomUUID(),
      eventId,
      createdByUserId: input.createdByUserId ?? existing?.createdByUserId ?? null,
      status,
      rejectionReason: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  };

  const mergePublishedRevision = (event: Event, publishedAt: string): Event => {
    const revision = event.pendingRevision;
    if (!revision) {
      return event;
    }

    return {
      ...event,
      ...revision,
      id: event.id,
      createdByUserId: event.createdByUserId,
      status: "PUBLISHED",
      publishedAt,
      publicationEndAt: revision.eventEndAt,
      rejectionReason: null,
      pendingRevision: null,
      createdAt: event.createdAt,
      updatedAt: new Date().toISOString()
    };
  };

  return {
    list: async () => Array.from(events.values()),
    getById: async (id) => events.get(id) ?? null,
    create: (input: CreateEventInput) => {
      const now = new Date().toISOString();
      const event: Event = {
        ...input,
        id: randomUUID(),
        createdByUserId: input.createdByUserId ?? null,
        status: "DRAFT",
        publishedAt: null,
        publicationEndAt: input.eventEndAt,
        rejectionReason: null,
        pendingRevision: null,
        createdAt: now,
        updatedAt: now
      };

      events.set(event.id, event);
      return Promise.resolve(event);
    },
    update: async (id, input) => {
      const existing = events.get(id);
      if (!existing) {
        return null;
      }
      const updated: Event = {
        ...existing,
        ...input,
        createdByUserId: existing.createdByUserId ?? null,
        publicationEndAt: input.eventEndAt,
        pendingRevision: existing.pendingRevision,
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    },
    upsertPendingRevision: async (id, input, status) => {
      const existing = events.get(id);
      if (!existing) {
        return null;
      }

      const updated: Event = {
        ...existing,
        pendingRevision: buildRevision(id, input, status, existing.pendingRevision),
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    },
    submitPendingRevision: async (id) => {
      const existing = events.get(id);
      if (!existing?.pendingRevision || existing.pendingRevision.status === "PENDING") {
        return null;
      }

      const updated: Event = {
        ...existing,
        pendingRevision: {
          ...existing.pendingRevision,
          status: "PENDING",
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    },
    rejectPendingRevision: async (id, reason) => {
      const existing = events.get(id);
      if (!existing?.pendingRevision) {
        return null;
      }

      const updated: Event = {
        ...existing,
        pendingRevision: {
          ...existing.pendingRevision,
          status: "REJECTED",
          rejectionReason: reason,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    },
    publishPendingRevision: async (id, publishedAt) => {
      const existing = events.get(id);
      if (!existing?.pendingRevision || existing.pendingRevision.status !== "PENDING") {
        return null;
      }

      const updated = mergePublishedRevision(existing, publishedAt);
      events.set(id, updated);
      return updated;
    },
    delete: async (id) => events.delete(id),
    updateStatus: async (id, status, data) => {
      const existing = events.get(id);
      if (!existing) {
        return null;
      }
      const updated: Event = {
        ...existing,
        status,
        publishedAt: data.publishedAt,
        rejectionReason: data.rejectionReason,
        publicationEndAt: data.publicationEndAt,
        pendingRevision: existing.pendingRevision,
        updatedAt: new Date().toISOString()
      };
      events.set(id, updated);
      return updated;
    }
  };
};
