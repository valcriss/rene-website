import { Event, EventOccurrenceInput } from "./types";

// publicationEndAt is a storage-level derived field: the event stays publicly listed until the
// latest of its occurrences ends. With no dated occurrence yet (e.g. a title-only draft), it falls
// back to "now" — a placeholder with no visible effect until the event is actually submitted, which
// requires at least one complete (dated) occurrence.
export const computePublicationEndAt = (occurrences: EventOccurrenceInput[]): Date => {
  const endTimes = occurrences
    .map((occurrence) => occurrence.eventEndAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));

  if (endTimes.length === 0) {
    return new Date();
  }

  return new Date(Math.max(...endTimes));
};

const earliestStart = (event: Pick<Event, "occurrences">): number => {
  const startTimes = event.occurrences
    .map((occurrence) => occurrence.eventStartAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));

  return startTimes.length > 0 ? Math.min(...startTimes) : Number.POSITIVE_INFINITY;
};

// Events with no dated occurrence yet (title-only drafts) sort last — there is no meaningful
// chronological position for them.
export const sortEventsByEarliestOccurrence = <T extends Pick<Event, "occurrences">>(events: T[]): T[] =>
  [...events].sort((left, right) => earliestStart(left) - earliestStart(right));
