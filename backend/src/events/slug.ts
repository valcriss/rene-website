import { EventOccurrenceInput } from "./types";
import { EventRepository } from "./repository";

// Strips accents (NFD-decompose then drop combining marks) and any character that isn't a-z/0-9
// so the slug is plain ASCII and stable regardless of the source title's language or punctuation.
export const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getEarliestOccurrence = (occurrences: EventOccurrenceInput[]): EventOccurrenceInput | null => {
  let earliest: EventOccurrenceInput | null = null;
  let earliestTime = Number.POSITIVE_INFINITY;

  for (const occurrence of occurrences) {
    if (!occurrence.eventStartAt) {
      continue;
    }
    const time = new Date(occurrence.eventStartAt).getTime();
    if (Number.isFinite(time) && time < earliestTime) {
      earliestTime = time;
      earliest = occurrence;
    }
  }

  return earliest;
};

// The slug seed favors title + city + year (e.g. "concert-jazz-descartes-2026") when a dated,
// located occurrence is available, and falls back to the title alone otherwise.
export const buildEventSlugBase = (title: string, occurrences: EventOccurrenceInput[]): string => {
  const earliest = getEarliestOccurrence(occurrences);
  const city = earliest?.city?.trim() || null;
  const year = earliest?.eventStartAt ? new Date(earliest.eventStartAt).getUTCFullYear() : null;

  const parts = [slugify(title)];
  if (city) {
    parts.push(slugify(city));
  }
  if (year) {
    parts.push(String(year));
  }

  const base = parts.filter(Boolean).join("-");
  return base || "evenement";
};

// Deterministic collision resolution: always picks the lowest free numeric suffix, so re-running
// this against the same repository state always yields the same slug.
export const generateUniqueEventSlug = async (
  repo: Pick<EventRepository, "findBySlug">,
  title: string,
  occurrences: EventOccurrenceInput[]
): Promise<string> => {
  const base = buildEventSlugBase(title, occurrences);
  let candidate = base;
  let suffix = 2;

  while (await repo.findBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};
