import type { EventOccurrence, GeolocationPrecision } from "../api/events";
import { getEventLocationLabel } from "./eventLocation";
import { formatDateRange } from "./formatters";

export const hasResolvedCoordinates = (
  occurrence: Pick<EventOccurrence, "latitude" | "longitude">
): occurrence is Pick<EventOccurrence, "latitude" | "longitude"> & { latitude: number; longitude: number } =>
  typeof occurrence.latitude === "number" &&
  Number.isFinite(occurrence.latitude) &&
  typeof occurrence.longitude === "number" &&
  Number.isFinite(occurrence.longitude);

export const getGeolocationPrecision = (
  occurrence: Pick<EventOccurrence, "latitude" | "longitude" | "geolocationPrecision">
): GeolocationPrecision => occurrence.geolocationPrecision ?? (hasResolvedCoordinates(occurrence) ? "EXACT" : "UNRESOLVED");

export const isOccurrenceGeolocated = (
  occurrence: Pick<EventOccurrence, "latitude" | "longitude" | "geolocationPrecision">
) => hasResolvedCoordinates(occurrence) && getGeolocationPrecision(occurrence) !== "UNRESOLVED";

export const isCompleteOccurrence = (
  occurrence: Pick<EventOccurrence, "city" | "eventStartAt" | "eventEndAt" | "allDay">
) =>
  Boolean(occurrence.city?.trim()) &&
  Boolean(occurrence.eventStartAt?.trim()) &&
  Boolean(occurrence.eventEndAt?.trim()) &&
  typeof occurrence.allDay === "boolean";

export const hasSubmittableGeolocation = (occurrences: EventOccurrence[]) => {
  const complete = occurrences.filter(isCompleteOccurrence);
  return complete.length > 0 && complete.every(isOccurrenceGeolocated);
};

const startTime = (occurrence: Pick<EventOccurrence, "eventStartAt">) => {
  if (!occurrence.eventStartAt) {
    return Number.POSITIVE_INFINITY;
  }
  const time = new Date(occurrence.eventStartAt).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

export const sortOccurrences = <T extends Pick<EventOccurrence, "eventStartAt">>(occurrences: T[]): T[] =>
  [...occurrences].sort((left, right) => startTime(left) - startTime(right));

export const getEarliestOccurrence = <T extends Pick<EventOccurrence, "eventStartAt">>(
  occurrences: T[]
): T | null => (occurrences.length === 0 ? null : sortOccurrences(occurrences)[0]);

export type EventDateSummary = {
  primary: Pick<EventOccurrence, "eventStartAt" | "eventEndAt"> | null;
  additionalCount: number;
};

export const getEventDateSummary = (occurrences: EventOccurrence[]): EventDateSummary => ({
  primary: getEarliestOccurrence(occurrences),
  additionalCount: Math.max(occurrences.length - 1, 0)
});

export const getEventLocationSummary = (occurrences: EventOccurrence[], fallback?: string | null) => {
  const primary = getEarliestOccurrence(occurrences);
  const label = getEventLocationLabel(primary ?? {}, fallback);
  const distinctCities = new Set(
    occurrences.map((occurrence) => occurrence.city?.trim()).filter((city): city is string => Boolean(city))
  );

  if (distinctCities.size > 1) {
    return `${label} (+${distinctCities.size - 1})`;
  }

  return label;
};

export const formatEventDateBadge = (occurrences: EventOccurrence[]): string => {
  const { primary, additionalCount } = getEventDateSummary(occurrences);
  if (!primary) {
    return "";
  }

  const range = formatDateRange(primary.eventStartAt ?? "", primary.eventEndAt ?? "");
  return additionalCount > 0 ? `${range} (+${additionalCount})` : range;
};

export const computePublicationEndAt = (
  occurrences: Array<Pick<EventOccurrence, "eventEndAt">>
): string | undefined => {
  const endTimes = occurrences
    .map((occurrence) => occurrence.eventEndAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));

  if (endTimes.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...endTimes)).toISOString();
};
