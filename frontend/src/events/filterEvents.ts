import { EventItem } from "../api/events";

export type DateRange = {
  start: string;
  end: string;
};

export type EventFilters = {
  search: string;
  cities: string[];
  types: string[];
  preset?: string;
  dateRange: DateRange;
};

const normalize = (value: string) => value.trim().toLowerCase();

const parseDateInput = (value: string, endOfDay: boolean) => {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeList = (values: string[]) => values.map(normalize);

const withinDateRange = (eventStart: Date, eventEnd: Date, range: DateRange) => {
  const start = parseDateInput(range.start, false);
  const end = parseDateInput(range.end, true);

  if (!start && !end) {
    return true;
  }

  let rangeStart = start;
  let rangeEnd = end;

  if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  if (rangeStart && eventEnd < rangeStart) {
    return false;
  }

  if (rangeEnd && eventStart > rangeEnd) {
    return false;
  }

  return true;
};

export const filterEvents = (events: EventItem[], filters: EventFilters): EventItem[] => {
  const search = normalize(filters.search);
  const cities = normalizeList(filters.cities);
  const types = normalizeList(filters.types);

  return events.filter((event) => {
    const eventStart = new Date(event.eventStartAt);
    const eventEnd = new Date(event.eventEndAt);

    if (
      search &&
      !normalize(event.title).includes(search) &&
      !normalize(event.venueName).includes(search) &&
      !normalize(event.city).includes(search) &&
      !normalize(event.content ?? "").includes(search)
    ) {
      return false;
    }

    if (cities.length > 0 && !cities.includes(normalize(event.city))) {
      return false;
    }

    if (types.length > 0 && !types.includes(normalize(event.categoryId))) {
      return false;
    }

    return withinDateRange(eventStart, eventEnd, filters.dateRange);
  });
};
