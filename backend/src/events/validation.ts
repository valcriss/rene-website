import { EventDraftInput, SocialLink, SocialLinkType } from "./types";
import { sanitizeEventContent, sanitizeEventPricingInfo } from "./sanitize";

type ValidationResult =
  | { ok: true; value: EventDraftInput }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const isOptionalString = (value: unknown) => value === undefined || value === null || typeof value === "string";
const normalizeOptionalString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

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
  if (!isNonEmptyString(data.audienceId)) errors.push("Le public concerné est requis.");
  if (!isNonEmptyString(data.eventStartAt)) errors.push("La date de début est requise.");
  if (!isNonEmptyString(data.eventEndAt)) errors.push("La date de fin est requise.");
  if (typeof data.allDay !== "boolean") errors.push("Le champ allDay doit être un booléen.");
  if (!isNonEmptyString(data.postalCode)) errors.push("Le code postal est requis.");
  if (!isNonEmptyString(data.city)) errors.push("La ville est requise.");
  if (!isNonEmptyString(data.organizerName)) errors.push("L'organisateur est requis.");

  if (!isOptionalString(data.venueName)) errors.push("Le lieu doit être une chaîne.");
  if (!isOptionalString(data.address)) errors.push("L'adresse doit être une chaîne.");
  if (!isOptionalString(data.organizerUrl)) errors.push("Le site de l'organisateur doit être une chaîne.");
  if (!isOptionalString(data.contactEmail)) errors.push("L'email de contact doit être une chaîne.");
  if (!isOptionalString(data.contactPhone)) errors.push("Le téléphone de contact doit être une chaîne.");
  if (!isOptionalString(data.ticketUrl)) errors.push("Le lien de billetterie doit être une chaîne.");
  if (!isOptionalString(data.pricingInfo)) errors.push("Les informations tarifaires doivent être une chaîne.");
  if (!isOptionalString(data.websiteUrl)) errors.push("Le site web doit être une chaîne.");

  const socialLinksResult = normalizeSocialLinks(data.socialLinks);
  errors.push(...socialLinksResult.errors);

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
  const sanitizedPricingInfo = typeof data.pricingInfo === "string"
    ? sanitizeEventPricingInfo(data.pricingInfo)
    : undefined;
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
      audienceId: data.audienceId as string,
      eventStartAt: data.eventStartAt as string,
      eventEndAt: data.eventEndAt as string,
      allDay: data.allDay as boolean,
      venueName: normalizeOptionalString(data.venueName),
      address: normalizeOptionalString(data.address),
      postalCode: (data.postalCode as string).trim(),
      city: (data.city as string).trim(),
      latitude,
      longitude,
      organizerName: data.organizerName as string,
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
