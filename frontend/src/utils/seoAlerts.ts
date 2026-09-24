// Non-blocking editorial nudges for issue #55: none of these ever prevent saving a draft or
// submitting for moderation (backend completeness rules already cover the truly required
// fields) — they only flag content that would hurt discoverability/sharing so an editor can
// choose to improve it before publishing.
export type SeoAlertCode = "genericTitle" | "thinDescription" | "missingImage" | "incoherentDates" | "missingLocation";

export type SeoAlertOccurrence = {
  city?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
};

export type SeoAlertInput = {
  title: string;
  description: string;
  image?: string | null;
  occurrences: SeoAlertOccurrence[];
};

const MINIMUM_TITLE_LENGTH = 10;
const MINIMUM_DESCRIPTION_LENGTH = 50;

const hasIncoherentDates = (occurrences: SeoAlertOccurrence[]): boolean =>
  occurrences.some((occurrence) => {
    if (!occurrence.eventStartAt || !occurrence.eventEndAt) {
      return false;
    }
    const start = new Date(occurrence.eventStartAt).getTime();
    const end = new Date(occurrence.eventEndAt).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end < start;
  });

const hasMissingLocation = (occurrences: SeoAlertOccurrence[]): boolean =>
  occurrences.length === 0 || occurrences.every((occurrence) => !occurrence.city || occurrence.city.trim().length === 0);

export const computeSeoAlerts = (input: SeoAlertInput): SeoAlertCode[] => {
  const alerts: SeoAlertCode[] = [];

  if (input.title.trim().length < MINIMUM_TITLE_LENGTH) {
    alerts.push("genericTitle");
  }
  if (input.description.trim().length < MINIMUM_DESCRIPTION_LENGTH) {
    alerts.push("thinDescription");
  }
  if (!input.image) {
    alerts.push("missingImage");
  }
  if (hasIncoherentDates(input.occurrences)) {
    alerts.push("incoherentDates");
  }
  if (hasMissingLocation(input.occurrences)) {
    alerts.push("missingLocation");
  }

  return alerts;
};
