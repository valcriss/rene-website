import type { EventItem } from "../api/events";
import { getEventLocationLabel } from "./eventLocation";
import { hasResolvedCoordinates } from "./occurrences";
import { formatDateRange } from "./formatters";

export type EventMapPin = {
  id: string;
  eventId: string;
  latitude: number;
  longitude: number;
  popupHtml: string;
  tooltipHtml: string;
};

export const buildEventMapPins = (events: EventItem[]): EventMapPin[] =>
  events.flatMap((event) =>
    (event.occurrences ?? [])
      .filter(hasResolvedCoordinates)
      .map((occurrence) => ({
        id: `${event.id}:${occurrence.id}`,
        eventId: event.id,
        latitude: occurrence.latitude as number,
        longitude: occurrence.longitude as number,
        popupHtml: `<strong>${event.title}</strong><br/>${getEventLocationLabel(occurrence, event.title)}`,
        tooltipHtml: `<strong>${event.title}</strong><br/>${formatDateRange(occurrence.eventStartAt ?? "", occurrence.eventEndAt ?? "")}`
      }))
  );
