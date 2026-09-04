import { randomUUID } from "node:crypto";
import { EventRepository } from "./repository";
import { CreateEventInput, Event, EventOccurrence, EventOccurrenceInput, EventRevision, EventRevisionStatus } from "./types";
import { computePublicationEndAt, sortEventsByEarliestOccurrence } from "./occurrences";

const cloneSocialLinks = (socialLinks: CreateEventInput["socialLinks"]) => socialLinks?.map((link) => ({ ...link })) ?? [];

const buildOccurrences = (occurrences: EventOccurrenceInput[]): EventOccurrence[] => {
  const now = new Date().toISOString();
  return occurrences.map((occurrence) => ({
    ...occurrence,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now
  }));
};

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
      socialLinks: cloneSocialLinks(input.socialLinks),
      occurrences: buildOccurrences(input.occurrences),
      id: existing?.id ?? randomUUID(),
      eventId,
      createdByUserId: input.createdByUserId ?? existing?.createdByUserId ?? null,
      featured: input.featured ?? existing?.featured ?? false,
      status,
      rejectionReason: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  };

  const mergePublishedRevision = (event: Event, publishedAt: string): Event => {
    const revision = event.pendingRevision!;

    return {
      ...event,
      ...revision,
      id: event.id,
      createdByUserId: event.createdByUserId,
      status: "PUBLISHED",
      featured: false,
      publishedAt,
      publicationEndAt: computePublicationEndAt(revision.occurrences).toISOString(),
      rejectionReason: null,
      pendingRevision: null,
      createdAt: event.createdAt,
      updatedAt: new Date().toISOString()
    };
  };

  return {
    list: async () => sortEventsByEarliestOccurrence(Array.from(events.values())),
    getById: async (id) => events.get(id) ?? null,
    create: (input: CreateEventInput) => {
      const now = new Date().toISOString();
      const event: Event = {
        ...input,
        socialLinks: cloneSocialLinks(input.socialLinks),
        occurrences: buildOccurrences(input.occurrences),
        id: randomUUID(),
        createdByUserId: input.createdByUserId ?? null,
        featured: false,
        status: "DRAFT",
        publishedAt: null,
        publicationEndAt: computePublicationEndAt(input.occurrences).toISOString(),
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
        socialLinks: cloneSocialLinks(input.socialLinks),
        occurrences: buildOccurrences(input.occurrences),
        createdByUserId: existing.createdByUserId ?? null,
        publicationEndAt: computePublicationEndAt(input.occurrences).toISOString(),
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
    updateFeatured: async (id, featured) => {
      const existing = events.get(id);
      if (!existing) {
        return null;
      }
      const updated: Event = {
        ...existing,
        featured,
        updatedAt: new Date().toISOString()
      };
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
        featured: data.featured ?? existing.featured,
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
