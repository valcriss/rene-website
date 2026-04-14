import { prisma } from "../prisma/client";
import { EventRepository } from "./repository";
import { CreateEventInput, Event, EventRevision, EventRevisionStatus, EventStatus } from "./types";

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

type PrismaEvent = {
  id: string;
  title: string;
  content: string;
  image: string;
  createdByUserId?: string | null;
  categoryId: string;
  audienceId: string;
  eventStartAt: Date;
  eventEndAt: Date;
  allDay: boolean;
  venueName: string;
  address: string | null;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
  organizerName: string;
  organizerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ticketUrl: string | null;
  pricingInfo: string | null;
  websiteUrl: string | null;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  publishedAt: Date | null;
  publicationEndAt: Date;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  pendingRevision: PrismaEventRevision | null;
};

type PrismaEventRevision = {
  id: string;
  eventId: string;
  title: string;
  content: string;
  image: string;
  createdByUserId?: string | null;
  categoryId: string;
  audienceId: string;
  eventStartAt: Date;
  eventEndAt: Date;
  allDay: boolean;
  venueName: string;
  address: string | null;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
  organizerName: string;
  organizerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ticketUrl: string | null;
  pricingInfo: string | null;
  websiteUrl: string | null;
  status: "DRAFT" | "PENDING" | "REJECTED";
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toRevision = (data: PrismaEventRevision): EventRevision => ({
  id: data.id,
  eventId: data.eventId,
  title: data.title,
  content: data.content,
  image: data.image,
  createdByUserId: data.createdByUserId ?? null,
  categoryId: data.categoryId,
  audienceId: data.audienceId,
  eventStartAt: data.eventStartAt.toISOString(),
  eventEndAt: data.eventEndAt.toISOString(),
  allDay: data.allDay,
  venueName: data.venueName,
  address: data.address ?? "",
  postalCode: data.postalCode,
  city: data.city,
  latitude: data.latitude,
  longitude: data.longitude,
  organizerName: data.organizerName,
  organizerUrl: data.organizerUrl ?? undefined,
  contactEmail: data.contactEmail ?? undefined,
  contactPhone: data.contactPhone ?? undefined,
  ticketUrl: data.ticketUrl ?? undefined,
  pricingInfo: data.pricingInfo ?? undefined,
  websiteUrl: data.websiteUrl ?? undefined,
  status: data.status,
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
  eventStartAt: data.eventStartAt.toISOString(),
  eventEndAt: data.eventEndAt.toISOString(),
  allDay: data.allDay,
  venueName: data.venueName,
  address: data.address ?? "",
  postalCode: data.postalCode,
  city: data.city,
  latitude: data.latitude,
  longitude: data.longitude,
  organizerName: data.organizerName,
  organizerUrl: data.organizerUrl ?? undefined,
  contactEmail: data.contactEmail ?? undefined,
  contactPhone: data.contactPhone ?? undefined,
  ticketUrl: data.ticketUrl ?? undefined,
  pricingInfo: data.pricingInfo ?? undefined,
  websiteUrl: data.websiteUrl ?? undefined,
  status: data.status,
  publishedAt: data.publishedAt ? data.publishedAt.toISOString() : null,
  publicationEndAt: data.publicationEndAt.toISOString(),
  rejectionReason: data.rejectionReason,
  pendingRevision: data.pendingRevision ? toRevision(data.pendingRevision) : null,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

const prismaClient = prisma as unknown as PrismaEventsClient;

const ensureCategoryExists = async (categoryId: string) => {
  const category = await prismaClient.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error("Category not found");
  }
};

const ensureAudienceExists = async (audienceId: string) => {
  const audience = await prismaClient.audience.findUnique({ where: { id: audienceId } });
  if (!audience) {
    throw new Error("Audience not found");
  }
};

export const createPrismaEventRepository = (): EventRepository => ({
  list: async () =>
    prismaClient.event.findMany({ include: { pendingRevision: true }, orderBy: { eventStartAt: "asc" } }).then((items) => items.map(toEvent)),
  getById: async (id: string) =>
    prismaClient.event.findUnique({ where: { id }, include: { pendingRevision: true } }).then((item) => (item ? toEvent(item) : null)),
  create: async (input: CreateEventInput) => {
    await ensureCategoryExists(input.categoryId);
    await ensureAudienceExists(input.audienceId);
    const data = {
      title: input.title,
      content: input.content,
      image: input.image,
      createdByUserId: input.createdByUserId ?? null,
      categoryId: input.categoryId,
      audienceId: input.audienceId,
      eventStartAt: new Date(input.eventStartAt),
      eventEndAt: new Date(input.eventEndAt),
      allDay: input.allDay,
      venueName: input.venueName,
      address: input.address,
      postalCode: input.postalCode,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      organizerName: input.organizerName,
      organizerUrl: input.organizerUrl ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      ticketUrl: input.ticketUrl ?? null,
      pricingInfo: input.pricingInfo ?? null,
      websiteUrl: input.websiteUrl ?? null,
      status: "DRAFT" as EventStatus,
      publishedAt: null,
      publicationEndAt: new Date(input.eventEndAt),
      rejectionReason: null
    };

    return prismaClient.event.create({ data, include: { pendingRevision: true } }).then(toEvent);
  },
  update: async (id: string, input: CreateEventInput) => {
    await ensureCategoryExists(input.categoryId);
    await ensureAudienceExists(input.audienceId);
    try {
      const updated = await prismaClient.event.update({
        where: { id },
        include: { pendingRevision: true },
        data: {
          title: input.title,
          content: input.content,
          image: input.image,
          categoryId: input.categoryId,
          audienceId: input.audienceId,
          eventStartAt: new Date(input.eventStartAt),
          eventEndAt: new Date(input.eventEndAt),
          allDay: input.allDay,
          venueName: input.venueName,
          address: input.address,
          postalCode: input.postalCode,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          organizerName: input.organizerName,
          organizerUrl: input.organizerUrl ?? null,
          contactEmail: input.contactEmail ?? null,
          contactPhone: input.contactPhone ?? null,
          ticketUrl: input.ticketUrl ?? null,
          pricingInfo: input.pricingInfo ?? null,
          websiteUrl: input.websiteUrl ?? null,
          publicationEndAt: new Date(input.eventEndAt)
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
      const updated = await prismaClient.event.update({
        where: { id },
        include: { pendingRevision: true },
        data: {
          pendingRevision: {
            upsert: {
              create: {
                title: input.title,
                content: input.content,
                image: input.image,
                createdByUserId: input.createdByUserId ?? null,
                categoryId: input.categoryId,
                audienceId: input.audienceId,
                eventStartAt: new Date(input.eventStartAt),
                eventEndAt: new Date(input.eventEndAt),
                allDay: input.allDay,
                venueName: input.venueName,
                address: input.address,
                postalCode: input.postalCode,
                city: input.city,
                latitude: input.latitude,
                longitude: input.longitude,
                organizerName: input.organizerName,
                organizerUrl: input.organizerUrl ?? null,
                contactEmail: input.contactEmail ?? null,
                contactPhone: input.contactPhone ?? null,
                ticketUrl: input.ticketUrl ?? null,
                pricingInfo: input.pricingInfo ?? null,
                websiteUrl: input.websiteUrl ?? null,
                status: status as never,
                rejectionReason: null
              },
              update: {
                title: input.title,
                content: input.content,
                image: input.image,
                createdByUserId: input.createdByUserId ?? null,
                categoryId: input.categoryId,
                audienceId: input.audienceId,
                eventStartAt: new Date(input.eventStartAt),
                eventEndAt: new Date(input.eventEndAt),
                allDay: input.allDay,
                venueName: input.venueName,
                address: input.address,
                postalCode: input.postalCode,
                city: input.city,
                latitude: input.latitude,
                longitude: input.longitude,
                organizerName: input.organizerName,
                organizerUrl: input.organizerUrl ?? null,
                contactEmail: input.contactEmail ?? null,
                contactPhone: input.contactPhone ?? null,
                ticketUrl: input.ticketUrl ?? null,
                pricingInfo: input.pricingInfo ?? null,
                websiteUrl: input.websiteUrl ?? null,
                status: status as never,
                rejectionReason: null
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
      const existing = await prismaClient.event.findUnique({ where: { id }, include: { pendingRevision: true } });
      if (!existing?.pendingRevision) {
        return null;
      }
      const updated = await prismaClient.event.update({
        where: { id },
        include: { pendingRevision: true },
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
      const existing = await prismaClient.event.findUnique({ where: { id }, include: { pendingRevision: true } });
      if (!existing?.pendingRevision) {
        return null;
      }
      const updated = await prismaClient.event.update({
        where: { id },
        include: { pendingRevision: true },
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
        const existing = await transaction.event.findUnique({ where: { id }, include: { pendingRevision: true } });
        if (!existing?.pendingRevision || existing.pendingRevision.status !== "PENDING") {
          return null;
        }

        const revision = existing.pendingRevision;
        await transaction.event.update({
          where: { id },
          data: {
            title: revision.title,
            content: revision.content,
            image: revision.image,
            categoryId: revision.categoryId,
            audienceId: revision.audienceId,
            eventStartAt: revision.eventStartAt,
            eventEndAt: revision.eventEndAt,
            allDay: revision.allDay,
            venueName: revision.venueName,
            address: revision.address,
            postalCode: revision.postalCode,
            city: revision.city,
            latitude: revision.latitude,
            longitude: revision.longitude,
            organizerName: revision.organizerName,
            organizerUrl: revision.organizerUrl,
            contactEmail: revision.contactEmail,
            contactPhone: revision.contactPhone,
            ticketUrl: revision.ticketUrl,
            pricingInfo: revision.pricingInfo,
            websiteUrl: revision.websiteUrl,
            status: "PUBLISHED",
            publishedAt: new Date(publishedAt),
            rejectionReason: null,
            publicationEndAt: revision.eventEndAt,
            pendingRevision: {
              delete: true
            }
          },
          include: { pendingRevision: true }
        });

        return transaction.event.findUnique({ where: { id }, include: { pendingRevision: true } });
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
  updateStatus: async (id, status, data) => {
    try {
      const updated = await prismaClient.event.update({
        where: { id },
        include: { pendingRevision: true },
        data: {
          status,
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
