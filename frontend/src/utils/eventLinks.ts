import type { EventItem } from "../api/events";

// The canonical, crawlable event URL is slug-based (issue #50). Falling back to the legacy
// /event/:id path when a slug isn't loaded yet (e.g. right after a fresh publish, before this
// event's data has been refetched) still works: the backend 301-redirects it to the slug URL.
export const getEventDetailPath = (event: Pick<EventItem, "id" | "slug">): string =>
  event.slug ? `/evenements/${event.slug}` : `/event/${event.id}`;
