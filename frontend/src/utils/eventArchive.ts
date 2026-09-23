import type { EventItem } from "../api/events";

export const isEventArchived = (
  event: Pick<EventItem, "archivedAt" | "publicationEndAt">,
  now: Date = new Date()
): boolean => {
  if (event.archivedAt) {
    return true;
  }
  if (!event.publicationEndAt) {
    return false;
  }
  return new Date(event.publicationEndAt).getTime() < now.getTime();
};
