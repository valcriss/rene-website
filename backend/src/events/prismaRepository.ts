import { prisma } from "../prisma/client";
import { EventRepository } from "./repository";
import { CreateEventInput, Event, EventStatus } from "./types";

type PrismaEvent = {
  id: string;
  title: string;
  content: string;
  image: string;
  createdByUserId?: string | null;
  categoryId: string;
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
  websiteUrl: string | null;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  publishedAt: Date | null;
  publicationEndAt: Date;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toEvent = (data: PrismaEvent): Event => ({
  id: data.id,
  title: data.title,
  content: data.content,
  image: data.image,
  createdByUserId: data.createdByUserId ?? null,
  categoryId: data.categoryId,
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
  websiteUrl: data.websiteUrl ?? undefined,
  status: data.status,
  publishedAt: data.publishedAt ? data.publishedAt.toISOString() : null,
  publicationEndAt: data.publicationEndAt.toISOString(),
  rejectionReason: data.rejectionReason,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

const ensureCategoryExists = async (categoryId: string) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error("Category not found");
  }
};

export const createPrismaEventRepository = (): EventRepository => ({
  list: async () =>
    prisma.event
      .findMany({ orderBy: { eventStartAt: "asc" } })
      .then((items: PrismaEvent[]) => items.map(toEvent)),
  getById: async (id: string) =>
    prisma.event
      .findUnique({ where: { id } })
      .then((item: PrismaEvent | null) => (item ? toEvent(item) : null)),
  create: async (input: CreateEventInput) => {
    await ensureCategoryExists(input.categoryId);
    const data = {
      title: input.title,
      content: input.content,
      image: input.image,
      createdByUserId: input.createdByUserId ?? null,
      categoryId: input.categoryId,
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
      websiteUrl: input.websiteUrl ?? null,
      status: "DRAFT" as EventStatus,
      publishedAt: null,
      publicationEndAt: new Date(input.eventEndAt),
      rejectionReason: null
    };

    return prisma.event.create({ data }).then(toEvent);
  },
  update: async (id: string, input: CreateEventInput) => {
    await ensureCategoryExists(input.categoryId);
    try {
      const updated = await prisma.event.update({
        where: { id },
        data: {
          title: input.title,
          content: input.content,
          image: input.image,
          categoryId: input.categoryId,
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
          websiteUrl: input.websiteUrl ?? null,
          publicationEndAt: new Date(input.eventEndAt)
        }
      });
      return toEvent(updated);
    } catch {
      return null;
    }
  },
  delete: async (id: string) => {
    try {
      await prisma.event.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
  updateStatus: async (id, status, data) => {
    try {
      const updated = await prisma.event.update({
        where: { id },
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
