import { EventDraftInput } from "./types";
import { sanitizeEventContent } from "./sanitize";

type ValidationResult =
  | { ok: true; value: EventDraftInput }
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
    return { ok: false, errors: ["Le corps de la requête doit être un objet."] };
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];

  if (!isNonEmptyString(data.title)) errors.push("Le titre est requis.");
  if (!isNonEmptyString(data.content)) errors.push("Le contenu est requis.");
  if (!isNonEmptyString(data.image)) errors.push("L'image est requise.");
  if (!isNonEmptyString(data.categoryId)) errors.push("La catégorie est requise.");
  if (!isNonEmptyString(data.eventStartAt)) errors.push("La date de début est requise.");
  if (!isNonEmptyString(data.eventEndAt)) errors.push("La date de fin est requise.");
  if (typeof data.allDay !== "boolean") errors.push("Le champ allDay doit être un booléen.");
  if (!isNonEmptyString(data.venueName)) errors.push("Le lieu est requis.");
  if (!isNonEmptyString(data.address)) errors.push("L'adresse est requise.");
  if (!isNonEmptyString(data.postalCode)) errors.push("Le code postal est requis.");
  if (!isNonEmptyString(data.city)) errors.push("La ville est requise.");
  if (!isNonEmptyString(data.organizerName)) errors.push("L'organisateur est requis.");

  if (!isOptionalString(data.address)) errors.push("L'adresse doit être une chaîne.");
  if (!isOptionalString(data.organizerUrl)) errors.push("Le site de l'organisateur doit être une chaîne.");
  if (!isOptionalString(data.contactEmail)) errors.push("L'email de contact doit être une chaîne.");
  if (!isOptionalString(data.contactPhone)) errors.push("Le téléphone de contact doit être une chaîne.");
  if (!isOptionalString(data.ticketUrl)) errors.push("Le lien de billetterie doit être une chaîne.");
  if (!isOptionalString(data.websiteUrl)) errors.push("Le site web doit être une chaîne.");

  const latitude = data.latitude === undefined ? undefined : asNumber(data.latitude);
  const longitude = data.longitude === undefined ? undefined : asNumber(data.longitude);

  if (data.latitude !== undefined && !Number.isFinite(latitude)) errors.push("La latitude doit être un nombre.");
  if (data.longitude !== undefined && !Number.isFinite(longitude)) errors.push("La longitude doit être un nombre.");

  if (typeof latitude === "number" && Number.isFinite(latitude) && (latitude < -90 || latitude > 90)) {
    errors.push("La latitude doit être comprise entre -90 et 90.");
  }

  if (typeof longitude === "number" && Number.isFinite(longitude) && (longitude < -180 || longitude > 180)) {
    errors.push("La longitude doit être comprise entre -180 et 180.");
  }

  const eventStartAt = typeof data.eventStartAt === "string" ? data.eventStartAt : null;
  const eventEndAt = typeof data.eventEndAt === "string" ? data.eventEndAt : null;

  if (eventStartAt && eventStartAt.trim().length > 0 && !isValidDate(eventStartAt)) {
    errors.push("La date de début est invalide.");
  }

  if (eventEndAt && eventEndAt.trim().length > 0 && !isValidDate(eventEndAt)) {
    errors.push("La date de fin est invalide.");
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
      errors.push("La date de fin doit être après la date de début.");
    }
  }

  const sanitizedContent = typeof data.content === "string" ? sanitizeEventContent(data.content) : "";
  if (typeof data.content === "string" && sanitizedContent.trim().length === 0) {
    errors.push("Le contenu est requis.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title: data.title as string,
      content: sanitizedContent,
      image: data.image as string,
      categoryId: data.categoryId as string,
      eventStartAt: data.eventStartAt as string,
      eventEndAt: data.eventEndAt as string,
      allDay: data.allDay as boolean,
      venueName: data.venueName as string,
      address: data.address as string,
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
