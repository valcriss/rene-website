import { EventDraftInput, EventOccurrenceInput, SocialLink, SocialLinkType } from "./types";
import { sanitizeEventContent, sanitizeEventPricingInfo } from "./sanitize";

type ValidationResult =
  | { ok: true; value: EventDraftInput }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const isOptionalString = (value: unknown) => value === undefined || value === null || typeof value === "string";
const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isValidDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime());
};

const asNumber = (value: unknown) => (typeof value === "number" ? value : Number.NaN);
const socialLinkTypes = new Set<SocialLinkType>(["FACEBOOK", "INSTAGRAM", "YOUTUBE", "LINKEDIN", "X", "TIKTOK"]);

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

const normalizeSocialLinks = (value: unknown): { links?: SocialLink[]; errors: string[] } => {
  if (value === undefined || value === null) {
    return { errors: [] };
  }

  if (!Array.isArray(value)) {
    return { errors: ["Les réseaux sociaux doivent être une liste."] };
  }

  const errors: string[] = [];
  const seenTypes = new Set<SocialLinkType>();
  const links: SocialLink[] = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`Le réseau social #${index + 1} est invalide.`);
      return;
    }

    const rawType = item.type;
    const rawUrl = item.url;

    if (typeof rawType !== "string" || !socialLinkTypes.has(rawType as SocialLinkType)) {
      errors.push(`Le type du réseau social #${index + 1} est invalide.`);
    }

    if (typeof rawUrl !== "string") {
      errors.push(`L'URL du réseau social #${index + 1} est invalide.`);
      return;
    }

    const url = rawUrl.trim();
    if (url.length === 0) {
      errors.push(`L'URL du réseau social #${index + 1} est requise.`);
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.push(`L'URL du réseau social #${index + 1} doit commencer par http:// ou https://.`);
        return;
      }
    } catch {
      errors.push(`L'URL du réseau social #${index + 1} est invalide.`);
      return;
    }

    if (typeof rawType === "string" && socialLinkTypes.has(rawType as SocialLinkType)) {
      const type = rawType as SocialLinkType;
      if (seenTypes.has(type)) {
        errors.push(`Le réseau social ${type} est présent plusieurs fois.`);
        return;
      }

      seenTypes.add(type);
      links.push({ type, url });
    }
  });

  return { links, errors };
};

const validateOccurrence = (
  item: unknown,
  index: number
): { errors: string[]; value?: EventOccurrenceInput } => {
  const label = `Occurrence #${index + 1}`;

  if (!isRecord(item)) {
    return { errors: [`${label} est invalide.`] };
  }

  const errors: string[] = [];

  if (!isOptionalString(item.venueName)) errors.push(`${label} : le lieu doit être une chaîne.`);
  if (!isOptionalString(item.address)) errors.push(`${label} : l'adresse doit être une chaîne.`);
  if (!isOptionalString(item.postalCode)) errors.push(`${label} : le code postal doit être une chaîne.`);
  if (!isOptionalString(item.city)) errors.push(`${label} : la ville doit être une chaîne.`);
  if (!isOptionalString(item.eventStartAt)) errors.push(`${label} : la date de début doit être une chaîne.`);
  if (!isOptionalString(item.eventEndAt)) errors.push(`${label} : la date de fin doit être une chaîne.`);
  if (item.allDay !== undefined && item.allDay !== null && typeof item.allDay !== "boolean") {
    errors.push(`${label} : le champ allDay doit être un booléen.`);
  }

  const latitude = item.latitude === undefined ? undefined : asNumber(item.latitude);
  const longitude = item.longitude === undefined ? undefined : asNumber(item.longitude);

  if (item.latitude !== undefined && !Number.isFinite(latitude)) {
    errors.push(`${label} : la latitude saisie manuellement doit être un nombre.`);
  }
  if (item.longitude !== undefined && !Number.isFinite(longitude)) {
    errors.push(`${label} : la longitude saisie manuellement doit être un nombre.`);
  }
  if (typeof latitude === "number" && Number.isFinite(latitude) && (latitude < -90 || latitude > 90)) {
    errors.push(`${label} : la latitude saisie manuellement doit être comprise entre -90 et 90.`);
  }
  if (typeof longitude === "number" && Number.isFinite(longitude) && (longitude < -180 || longitude > 180)) {
    errors.push(`${label} : la longitude saisie manuellement doit être comprise entre -180 et 180.`);
  }

  const eventStartAt = typeof item.eventStartAt === "string" ? item.eventStartAt : null;
  const eventEndAt = typeof item.eventEndAt === "string" ? item.eventEndAt : null;

  if (eventStartAt && eventStartAt.trim().length > 0 && !isValidDate(eventStartAt)) {
    errors.push(`${label} : la date de début est invalide.`);
  }
  if (eventEndAt && eventEndAt.trim().length > 0 && !isValidDate(eventEndAt)) {
    errors.push(`${label} : la date de fin est invalide.`);
  }
  if (
    eventStartAt &&
    eventEndAt &&
    eventStartAt.trim().length > 0 &&
    eventEndAt.trim().length > 0 &&
    isValidDate(eventStartAt) &&
    isValidDate(eventEndAt) &&
    new Date(eventEndAt).getTime() < new Date(eventStartAt).getTime()
  ) {
    errors.push(`${label} : la date de fin doit être après la date de début.`);
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    value: {
      venueName: normalizeOptionalString(item.venueName),
      address: normalizeOptionalString(item.address),
      postalCode: normalizeOptionalString(item.postalCode),
      city: normalizeOptionalString(item.city),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      eventStartAt: normalizeOptionalString(item.eventStartAt),
      eventEndAt: normalizeOptionalString(item.eventEndAt),
      allDay: typeof item.allDay === "boolean" ? item.allDay : null
    }
  };
};

const normalizeOccurrences = (value: unknown): { occurrences: EventOccurrenceInput[]; errors: string[] } => {
  if (value === undefined || value === null) {
    return { occurrences: [], errors: [] };
  }

  if (!Array.isArray(value)) {
    return { occurrences: [], errors: ["Les occurrences doivent être une liste."] };
  }

  const errors: string[] = [];
  const occurrences: EventOccurrenceInput[] = [];

  value.forEach((item, index) => {
    const result = validateOccurrence(item, index);
    errors.push(...result.errors);
    if (result.value) {
      occurrences.push(result.value);
    }
  });

  return { occurrences, errors };
};

export const validateCreateEvent = (input: unknown): ValidationResult => {
  if (input === null || typeof input !== "object") {
    return { ok: false, errors: ["Le corps de la requête doit être un objet."] };
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];

  if (!isNonEmptyString(data.title)) errors.push("Le titre est requis.");
  if (!isOptionalString(data.content)) errors.push("Le contenu doit être une chaîne.");
  if (!isOptionalString(data.image)) errors.push("L'image doit être une chaîne.");
  if (!isOptionalString(data.categoryId)) errors.push("La catégorie doit être une chaîne.");
  if (!isOptionalString(data.audienceId)) errors.push("Le public concerné doit être une chaîne.");
  if (!isOptionalString(data.organizerName)) errors.push("L'organisateur doit être une chaîne.");

  if (!isOptionalString(data.organizerUrl)) errors.push("Le site de l'organisateur doit être une chaîne.");
  if (!isOptionalString(data.contactEmail)) errors.push("L'email de contact doit être une chaîne.");
  if (!isOptionalString(data.contactPhone)) errors.push("Le téléphone de contact doit être une chaîne.");
  if (!isOptionalString(data.ticketUrl)) errors.push("Le lien de billetterie doit être une chaîne.");
  if (!isOptionalString(data.pricingInfo)) errors.push("Les informations tarifaires doivent être une chaîne.");
  if (!isOptionalString(data.websiteUrl)) errors.push("Le site web doit être une chaîne.");

  const socialLinksResult = normalizeSocialLinks(data.socialLinks);
  errors.push(...socialLinksResult.errors);

  const occurrencesResult = normalizeOccurrences(data.occurrences);
  errors.push(...occurrencesResult.errors);

  const rawSanitizedContent = typeof data.content === "string" ? sanitizeEventContent(data.content) : null;
  const sanitizedContent = rawSanitizedContent && rawSanitizedContent.trim().length > 0 ? rawSanitizedContent : null;
  const sanitizedPricingInfo = typeof data.pricingInfo === "string"
    ? sanitizeEventPricingInfo(data.pricingInfo)
    : undefined;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title: (data.title as string).trim(),
      content: sanitizedContent,
      image: normalizeOptionalString(data.image),
      categoryId: normalizeOptionalString(data.categoryId),
      audienceId: normalizeOptionalString(data.audienceId),
      occurrences: occurrencesResult.occurrences,
      organizerName: normalizeOptionalString(data.organizerName),
      organizerUrl: data.organizerUrl as string | undefined,
      contactEmail: data.contactEmail as string | undefined,
      contactPhone: data.contactPhone as string | undefined,
      ticketUrl: data.ticketUrl as string | undefined,
      pricingInfo: sanitizedPricingInfo,
      websiteUrl: data.websiteUrl as string | undefined,
      socialLinks: socialLinksResult.links
    }
  };
};

export type SubmittableOccurrence = {
  city: string | null;
  eventStartAt: string | null;
  eventEndAt: string | null;
  allDay: boolean | null;
};

export type SubmittableEventFields = {
  title: string;
  content: string | null;
  image: string | null;
  categoryId: string | null;
  audienceId: string | null;
  organizerName: string | null;
  occurrences: SubmittableOccurrence[];
};

const isCompleteOccurrence = (occurrence: SubmittableOccurrence) =>
  isNonEmptyString(occurrence.city) &&
  isNonEmptyString(occurrence.eventStartAt) &&
  isNonEmptyString(occurrence.eventEndAt) &&
  typeof occurrence.allDay === "boolean";

export const validateEventCompleteness = (event: SubmittableEventFields): string[] => {
  const errors: string[] = [];

  if (!isNonEmptyString(event.title)) errors.push("Le titre est requis.");
  if (!isNonEmptyString(event.content)) errors.push("Le contenu est requis.");
  if (!isNonEmptyString(event.image)) errors.push("L'image est requise.");
  if (!isNonEmptyString(event.categoryId)) errors.push("La catégorie est requise.");
  if (!isNonEmptyString(event.audienceId)) errors.push("Le public concerné est requis.");
  if (!isNonEmptyString(event.organizerName)) errors.push("L'organisateur est requis.");

  if (event.occurrences.length === 0 || !event.occurrences.some(isCompleteOccurrence)) {
    errors.push("Au moins une date et un lieu (ville) sont requis.");
  }

  return errors;
};
