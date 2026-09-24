import { useHead } from "@unhead/vue";
import { toValue, type MaybeRefOrGetter } from "vue";
import { useRoute } from "vue-router";
import type { EventItem, EventOccurrence } from "../api/events";
import { useSiteUrl } from "./useSiteUrl";
import { toAbsoluteUrl, buildPlainTextDescription } from "../utils/seo";
import { hasResolvedCoordinates } from "../utils/occurrences";

type JsonLd = Record<string, unknown>;

const toScript = (data: JsonLd | JsonLd[]) => [{ type: "application/ld+json", innerHTML: JSON.stringify(data) }];

// Isomorphic with the site's own identity — no separate Organization entity is modeled in the
// data (no "publisher name" setting distinct from the site itself), so only WebSite is emitted.
export const useWebsiteStructuredData = (name: MaybeRefOrGetter<string>) => {
  const siteUrl = useSiteUrl();

  useHead({
    script: () =>
      toScript({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: toValue(name),
        url: toAbsoluteUrl(siteUrl, "/")
      })
  });
};

// All-day occurrences are normalized server-side to UTC day boundaries (00:00:00.000Z /
// 23:59:59.999Z, see backend/src/events/service.ts normalizeOccurrenceDates) purely as storage
// bookkeeping — they carry no real time-of-day. Google's guidance for all-day events is a
// date-only value, so that's what's emitted here instead of the padded UTC timestamp.
const toLdDate = (value: string | null, allDay: boolean): string | undefined => {
  if (!value) {
    return undefined;
  }
  return allDay ? value.slice(0, 10) : value;
};

const buildLocation = (occurrence: EventOccurrence): JsonLd => {
  const address: JsonLd = { "@type": "PostalAddress", addressCountry: "FR" };
  if (occurrence.address) {
    address.streetAddress = occurrence.address;
  }
  if (occurrence.postalCode) {
    address.postalCode = occurrence.postalCode;
  }
  if (occurrence.city) {
    address.addressLocality = occurrence.city;
  }

  const location: JsonLd = { "@type": "Place", address };
  if (occurrence.venueName) {
    location.name = occurrence.venueName;
  }
  if (hasResolvedCoordinates(occurrence)) {
    location.geo = { "@type": "GeoCoordinates", latitude: occurrence.latitude, longitude: occurrence.longitude };
  }

  return location;
};

// One Event object per occurrence (Google's recommendation for several distinct performances of
// the same production, including several simultaneous locations) rather than one composite Event
// with an invented single date/place.
const buildOccurrenceEvent = (event: EventItem, occurrence: EventOccurrence, siteUrl: string, pageUrl: string): JsonLd => {
  const allDay = Boolean(occurrence.allDay);
  const ld: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url: pageUrl,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: buildLocation(occurrence)
  };

  const startDate = toLdDate(occurrence.eventStartAt, allDay);
  if (startDate) {
    ld.startDate = startDate;
  }
  const endDate = toLdDate(occurrence.eventEndAt, allDay);
  if (endDate) {
    ld.endDate = endDate;
  }

  // Only a real, uploaded image is crawlable and actually the event's own image — the generic
  // placeholder SVG shown in its place is not something to advertise as structured data.
  if (event.image) {
    ld.image = [toAbsoluteUrl(siteUrl, event.image)];
  }

  const description = buildPlainTextDescription(event.content, 5000);
  if (description) {
    ld.description = description;
  }

  if (event.organizerName) {
    const organizer: JsonLd = { "@type": "Organization", name: event.organizerName };
    if (event.organizerUrl) {
      organizer.url = event.organizerUrl;
    }
    ld.organizer = organizer;
  }

  if (event.ticketUrl) {
    ld.offers = { "@type": "Offer", url: event.ticketUrl, availability: "https://schema.org/InStock" };
  }

  return ld;
};

export const useEventStructuredData = (eventRef: MaybeRefOrGetter<EventItem | null | undefined>) => {
  const siteUrl = useSiteUrl();
  const route = useRoute();

  useHead({
    script: () => {
      const event = toValue(eventRef);
      if (!event || event.occurrences.length === 0) {
        return [];
      }

      const pageUrl = toAbsoluteUrl(siteUrl, route.path);
      const entries = event.occurrences.map((occurrence) => buildOccurrenceEvent(event, occurrence, siteUrl, pageUrl));
      return toScript(entries.length === 1 ? entries[0] : entries);
    }
  });
};
