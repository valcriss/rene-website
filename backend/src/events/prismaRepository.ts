import { prisma } from "../prisma/client";
import { EventRepository } from "./repository";
import { CreateEventInput, Event, EventOccurrence, EventOccurrenceInput, EventRevision, EventStatus, GeolocationPrecision, SocialLink } from "./types";
import { computePublicationEndAt, sortEventsByEarliestOccurrence } from "./occurrences";

type PrismaEventsClient = {
  category: {
    findUnique(args: unknown): Promise<unknown>;
  };
  audience: {
    findUnique(args: unknown): Promise<unknown>;
  };
  event: {
    findMany(args: unknown): Promise<PrismaEvent[]>;
    findUnique(args: unknown): Promise<PrismaEvent | null>;
    create(args: unknown): Promise<PrismaEvent>;
    update(args: unknown): Promise<PrismaEvent>;
    delete(args: unknown): Promise<void>;
  };
  $transaction<T>(handler: (transaction: PrismaEventsClient) => Promise<T>): Promise<T>;
};

type PrismaEventOccurrence = {
  id: string;
  venueName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  geolocationPrecision: GeolocationPrecision;
  eventStartAt: Date | null;
  eventEndAt: Date | null;
  allDay: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaEvent = {
  id: string;
  title: string;
  content: string | null;
  image: string | null;
  createdByUserId?: string | null;
  categoryId: string | null;
  audienceId: string | null;
  organizerName: string | null;
  organizerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ticketUrl: string | null;
  pricingInfo: string | null;
  websiteUrl: string | null;
  socialLinks: unknown;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  featured: boolean;
  publishedAt: Date | null;
  publicationEndAt: Date;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  occurrences: PrismaEventOccurrence[];
  pendingRevision: PrismaEventRevision | null;
};

type PrismaEventRevision = {
  id: string;
  eventId: string;
  title: string;
  content: string | null;
  image: string | null;
  createdByUserId?: string | null;
  categoryId: string | null;
  audienceId: string | null;
  organizerName: string | null;
  organizerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ticketUrl: string | null;
  pricingInfo: string | null;
  websiteUrl: string | null;
  socialLinks: unknown;
  status: "DRAFT" | "PENDING" | "REJECTED";
  featured: boolean;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  occurrences: PrismaEventOccurrence[];
};

const asSocialLinks = (value: unknown): SocialLink[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SocialLink => {
    if (item === null || typeof item !== "object") {
      return false;
    }

    const candidate = item as Record<string, unknown>;
    return typeof candidate.type === "string" && typeof candidate.url === "string";
  });
};

const toOccurrence = (data: PrismaEventOccurrence): EventOccurrence => ({
  id: data.id,
  venueName: data.venueName,
  address: data.address,
  postalCode: data.postalCode,
  city: data.city,
  latitude: data.latitude,
  longitude: data.longitude,
  geolocationPrecision: data.geolocationPrecision,
  eventStartAt: data.eventStartAt ? data.eventStartAt.toISOString() : null,
  eventEndAt: data.eventEndAt ? data.eventEndAt.toISOString() : null,
  allDay: data.allDay,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

const toRevision = (data: PrismaEventRevision): EventRevision => ({
  id: data.id,
  eventId: data.eventId,
  title: data.title,
  content: data.content,
  image: data.image,
  createdByUserId: data.createdByUserId ?? null,
  categoryId: data.categoryId,
  audienceId: data.audienceId,
  occurrences: data.occurrences.map(toOccurrence),
  organizerName: data.organizerName,
  organizerUrl: data.organizerUrl ?? undefined,
  contactEmail: data.contactEmail ?? undefined,
  contactPhone: data.contactPhone ?? undefined,
  ticketUrl: data.ticketUrl ?? undefined,
  pricingInfo: data.pricingInfo ?? undefined,
  websiteUrl: data.websiteUrl ?? undefined,
  socialLinks: asSocialLinks(data.socialLinks),
  status: data.status,
  featured: data.featured,
  rejectionReason: data.rejectionReason,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

const toEvent = (data: PrismaEvent): Event => ({
  id: data.id,
  title: data.title,
  content: data.content,
  image: data.image,
  createdByUserId: data.createdByUserId ?? null,
  categoryId: data.categoryId,
  audienceId: data.audienceId,
  occurrences: data.occurrences.map(toOccurrence),
  organizerName: data.organizerName,
  organizerUrl: data.organizerUrl ?? undefined,
  contactEmail: data.contactEmail ?? undefined,
  contactPhone: data.contactPhone ?? undefined,
  ticketUrl: data.ticketUrl ?? undefined,
  pricingInfo: data.pricingInfo ?? undefined,
  websiteUrl: data.websiteUrl ?? undefined,
  socialLinks: asSocialLinks(data.socialLinks),
  status: data.status,
  featured: data.featured,
  publishedAt: data.publishedAt ? data.publishedAt.toISOString() : null,
  publicationEndAt: data.publicationEndAt.toISOString(),
  rejectionReason: data.rejectionReason,
  pendingRevision: data.pendingRevision ? toRevision(data.pendingRevision) : null,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

const prismaClient = prisma as unknown as PrismaEventsClient;

const includeOccurrencesAndRevision = {
  occurrences: true,
  pendingRevision: { include: { occurrences: true } }
};

const resolveGeolocationPrecision = (
  occurrence: Pick<EventOccurrenceInput, "latitude" | "longitude" | "geolocationPrecision">
) =>
  occurrence.geolocationPrecision ??
  (typeof occurrence.latitude === "number" &&
  Number.isFinite(occurrence.latitude) &&
  typeof occurrence.longitude === "number" &&
  Number.isFinite(occurrence.longitude)
    ? "EXACT"
    : "UNRESOLVED");

const ensureCategoryExists = async (categoryId: string | null) => {
  if (!categoryId) {
    return;
  }
  const category = await prismaClient.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error("Category not found");
  }
};

const ensureAudienceExists = async (audienceId: string | null) => {
  if (!audienceId) {
    return;
  }
  const audience = await prismaClient.audience.findUnique({ where: { id: audienceId } });
  if (!audience) {
    throw new Error("Audience not found");
  }
};

const toDateOrNull = (value: string | null) => (value ? new Date(value) : null);

const toOccurrenceCreateData = (occurrence: EventOccurrenceInput) => ({
  venueName: occurrence.venueName,
  address: occurrence.address,
  postalCode: occurrence.postalCode,
  city: occurrence.city,
  latitude: occurrence.latitude,
  longitude: occurrence.longitude,
  geolocationPrecision: resolveGeolocationPrecision(occurrence),
  eventStartAt: toDateOrNull(occurrence.eventStartAt),
  eventEndAt: toDateOrNull(occurrence.eventEndAt),
  allDay: occurrence.allDay
});

const eventFieldsData = (input: CreateEventInput) => ({
  title: input.title,
  content: input.content,
  image: input.image,
  categoryId: input.categoryId,
  audienceId: input.audienceId,
  organizerName: input.organizerName,
  organizerUrl: input.organizerUrl ?? null,
  contactEmail: input.contactEmail ?? null,
  contactPhone: input.contactPhone ?? null,
  ticketUrl: input.ticketUrl ?? null,
  pricingInfo: input.pricingInfo ?? null,
  websiteUrl: input.websiteUrl ?? null,
  socialLinks: input.socialLinks ?? []
});

export const createPrismaEventRepository = (): EventRepository => ({
  list: async () =>
    prismaClient.event
      .findMany({ include: includeOccurrencesAndRevision, orderBy: { createdAt: "asc" } })
      .then((items) => sortEventsByEarliestOccurrence(items.map(toEvent))),
  getById: async (id: string) =>
    prismaClient.event.findUnique({ where: { id }, include: includeOccurrencesAndRevision }).then((item) => (item ? toEvent(item) : null)),
  create: async (input: CreateEventInput) => {
    await ensureCategoryExists(input.categoryId);
    await ensureAudienceExists(input.audienceId);
    const data = {
      ...eventFieldsData(input),
      createdByUserId: input.createdByUserId ?? null,
      status: "DRAFT" as EventStatus,
      featured: false,
      publishedAt: null,
      publicationEndAt: computePublicationEndAt(input.occurrences),
      rejectionReason: null,
      occurrences: { create: input.occurrences.map(toOccurrenceCreateData) }
    };

    return prismaClient.event.create({ data, include: includeOccurrencesAndRevision }).then(toEvent);
  },
  update: async (id: string, input: CreateEventInput) => {
    await ensureCategoryExists(input.categoryId);
    await ensureAudienceExists(input.audienceId);
    try {
      const updated = await prismaClient.event.update({
        where: { id },
        include: includeOccurrencesAndRevision,
        data: {
          ...eventFieldsData(input),
          publicationEndAt: computePublicationEndAt(input.occurrences),
          occurrences: {
            deleteMany: {},
            create: input.occurrences.map(toOccurrenceCreateData)
          }
        }
      });
      return toEvent(updated);
    } catch {
      return null;
    }
  },
  upsertPendingRevision: async (id, input, status) => {
    await ensureCategoryExists(input.categoryId);
    await ensureAudienceExists(input.audienceId);
    try {
      const revisionFields = {
        ...eventFieldsData(input),
        createdByUserId: input.createdByUserId ?? null,
        featured: input.featured ?? false,
        status: status as never,
        rejectionReason: null
      };
      const updated = await prismaClient.event.update({
        where: { id },
        include: includeOccurrencesAndRevision,
        data: {
          pendingRevision: {
            upsert: {
              create: {
                ...revisionFields,
                occurrences: { create: input.occurrences.map(toOccurrenceCreateData) }
              },
              update: {
                ...revisionFields,
                occurrences: {
                  deleteMany: {},
                  create: input.occurrences.map(toOccurrenceCreateData)
                }
              }
            }
          }
        }
      });
      return toEvent(updated as PrismaEvent);
    } catch {
      return null;
    }
  },
  submitPendingRevision: async (id) => {
    try {
      const existing = await prismaClient.event.findUnique({ where: { id }, include: includeOccurrencesAndRevision });
      if (!existing?.pendingRevision) {
        return null;
      }
      const updated = await prismaClient.event.update({
        where: { id },
        include: includeOccurrencesAndRevision,
        data: {
          pendingRevision: {
            update: {
              status: "PENDING" as never,
              rejectionReason: null
            }
          }
        }
      });
      return toEvent(updated as PrismaEvent);
    } catch {
      return null;
    }
  },
  rejectPendingRevision: async (id, reason) => {
    try {
      const existing = await prismaClient.event.findUnique({ where: { id }, include: includeOccurrencesAndRevision });
      if (!existing?.pendingRevision) {
        return null;
      }
      const updated = await prismaClient.event.update({
        where: { id },
        include: includeOccurrencesAndRevision,
        data: {
          pendingRevision: {
            update: {
              status: "REJECTED" as never,
              rejectionReason: reason
            }
          }
        }
      });
      return toEvent(updated as PrismaEvent);
    } catch {
      return null;
    }
  },
  publishPendingRevision: async (id, publishedAt) => {
    try {
      const updated = await prismaClient.$transaction(async (transaction) => {
        const existing = await transaction.event.findUnique({ where: { id }, include: includeOccurrencesAndRevision });
        if (!existing?.pendingRevision || existing.pendingRevision.status !== "PENDING") {
          return null;
        }

        const revision = existing.pendingRevision;
        const revisionOccurrences: EventOccurrenceInput[] = revision.occurrences.map((occurrence) => ({
          venueName: occurrence.venueName,
          address: occurrence.address,
          postalCode: occurrence.postalCode,
          city: occurrence.city,
          latitude: occurrence.latitude,
          longitude: occurrence.longitude,
          geolocationPrecision: occurrence.geolocationPrecision,
          eventStartAt: occurrence.eventStartAt ? occurrence.eventStartAt.toISOString() : null,
          eventEndAt: occurrence.eventEndAt ? occurrence.eventEndAt.toISOString() : null,
          allDay: occurrence.allDay
        }));

        await transaction.event.update({
          where: { id },
          data: {
            title: revision.title,
            content: revision.content,
            image: revision.image,
            categoryId: revision.categoryId,
            audienceId: revision.audienceId,
            organizerName: revision.organizerName,
            organizerUrl: revision.organizerUrl,
            contactEmail: revision.contactEmail,
            contactPhone: revision.contactPhone,
            ticketUrl: revision.ticketUrl,
            pricingInfo: revision.pricingInfo,
            websiteUrl: revision.websiteUrl,
            featured: false,
            status: "PUBLISHED",
            publishedAt: new Date(publishedAt),
            rejectionReason: null,
            publicationEndAt: computePublicationEndAt(revisionOccurrences),
            occurrences: {
              deleteMany: {},
              create: revisionOccurrences.map(toOccurrenceCreateData)
            },
            pendingRevision: {
              delete: true
            }
          },
          include: includeOccurrencesAndRevision
        });

        return transaction.event.findUnique({ where: { id }, include: includeOccurrencesAndRevision });
      });

      return updated ? toEvent(updated as PrismaEvent) : null;
    } catch {
      return null;
    }
  },
  delete: async (id: string) => {
    try {
      await prismaClient.event.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
  updateFeatured: async (id, featured) => {
    try {
      const updated = await prismaClient.event.update({
        where: { id },
        include: includeOccurrencesAndRevision,
        data: { featured }
      });
      return toEvent(updated);
    } catch {
      return null;
    }
  },
  updateStatus: async (id, status, data) => {
    try {
      const updated = await prismaClient.event.update({
        where: { id },
        include: includeOccurrencesAndRevision,
        data: {
          status,
          featured: data.featured,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
          rejectionReason: data.rejectionReason,
          publicationEndAt: new Date(data.publicationEndAt)
        }
      });
      return toEvent(updated);
    } catch {
      return null;
    }
  }
});
