import { CreateEventInput } from "./types";

type ValidationResult =
  | { ok: true; value: CreateEventInput }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const isOptionalString = (value: unknown) => value === undefined || value === null || typeof value === "string";

const isValidDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime());
};

const asNumber = (value: unknown) => (typeof value === "number" ? value : Number.NaN);

export const validateCreateEvent = (input: unknown): ValidationResult => {
  if (input === null || typeof input !== "object") {
    return { ok: false, errors: ["body must be an object"] };
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];

  if (!isNonEmptyString(data.title)) errors.push("title is required");
  if (!isNonEmptyString(data.content)) errors.push("content is required");
  if (!isNonEmptyString(data.image)) errors.push("image is required");
  if (!isNonEmptyString(data.categoryId)) errors.push("categoryId is required");
  if (!isNonEmptyString(data.eventStartAt)) errors.push("eventStartAt is required");
  if (!isNonEmptyString(data.eventEndAt)) errors.push("eventEndAt is required");
  if (typeof data.allDay !== "boolean") errors.push("allDay must be boolean");
  if (!isNonEmptyString(data.venueName)) errors.push("venueName is required");
  if (!isNonEmptyString(data.postalCode)) errors.push("postalCode is required");
  if (!isNonEmptyString(data.city)) errors.push("city is required");
  if (!isNonEmptyString(data.organizerName)) errors.push("organizerName is required");

  if (!isOptionalString(data.address)) errors.push("address must be string");
  if (!isOptionalString(data.organizerUrl)) errors.push("organizerUrl must be string");
  if (!isOptionalString(data.contactEmail)) errors.push("contactEmail must be string");
  if (!isOptionalString(data.contactPhone)) errors.push("contactPhone must be string");
  if (!isOptionalString(data.ticketUrl)) errors.push("ticketUrl must be string");
  if (!isOptionalString(data.websiteUrl)) errors.push("websiteUrl must be string");

  const latitude = asNumber(data.latitude);
  const longitude = asNumber(data.longitude);

  if (!Number.isFinite(latitude)) errors.push("latitude must be number");
  if (!Number.isFinite(longitude)) errors.push("longitude must be number");

  if (Number.isFinite(latitude) && (latitude < -90 || latitude > 90)) {
    errors.push("latitude must be between -90 and 90");
  }

  if (Number.isFinite(longitude) && (longitude < -180 || longitude > 180)) {
    errors.push("longitude must be between -180 and 180");
  }

  const eventStartAt = typeof data.eventStartAt === "string" ? data.eventStartAt : null;
  const eventEndAt = typeof data.eventEndAt === "string" ? data.eventEndAt : null;

  if (eventStartAt && eventStartAt.trim().length > 0 && !isValidDate(eventStartAt)) {
    errors.push("eventStartAt must be a valid date");
  }

  if (eventEndAt && eventEndAt.trim().length > 0 && !isValidDate(eventEndAt)) {
    errors.push("eventEndAt must be a valid date");
  }

  if (
    eventStartAt &&
    eventEndAt &&
    eventStartAt.trim().length > 0 &&
    eventEndAt.trim().length > 0 &&
    isValidDate(eventStartAt) &&
    isValidDate(eventEndAt)
  ) {
    const start = new Date(eventStartAt).getTime();
    const end = new Date(eventEndAt).getTime();
    if (end < start) {
      errors.push("eventEndAt must be after eventStartAt");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title: data.title as string,
      content: data.content as string,
      image: data.image as string,
      categoryId: data.categoryId as string,
      eventStartAt: data.eventStartAt as string,
      eventEndAt: data.eventEndAt as string,
      allDay: data.allDay as boolean,
      venueName: data.venueName as string,
      address: data.address as string | undefined,
      postalCode: data.postalCode as string,
      city: data.city as string,
      latitude,
      longitude,
      organizerName: data.organizerName as string,
      organizerUrl: data.organizerUrl as string | undefined,
      contactEmail: data.contactEmail as string | undefined,
      contactPhone: data.contactPhone as string | undefined,
      ticketUrl: data.ticketUrl as string | undefined,
      websiteUrl: data.websiteUrl as string | undefined
    }
  };
};
