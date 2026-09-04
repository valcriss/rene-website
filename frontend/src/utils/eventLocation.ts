type EventLocationLike = {
  venueName?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

const normalizePart = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

const joinParts = (parts: Array<string | null | undefined>, separator: string) =>
  parts
    .map((part) => normalizePart(part))
    .filter((part) => part.length > 0)
    .join(separator);

export const getEventLocationLabel = (event: EventLocationLike, fallback = "") => {
  const venueName = normalizePart(event.venueName);
  const city = normalizePart(event.city);

  if (venueName.length > 0 && city.length > 0) {
    return `${venueName} · ${city}`;
  }

  return venueName || city || fallback;
};

export const getEventDirectionsQuery = (event: EventLocationLike, fallback = "") => {
  const address = normalizePart(event.address);
  const venueName = normalizePart(event.venueName);
  const postalCode = normalizePart(event.postalCode);
  const city = normalizePart(event.city);

  if (address.length > 0) {
    return joinParts([address, postalCode, city], ", ");
  }

  if (venueName.length > 0) {
    return joinParts([venueName, postalCode, city], ", ");
  }

  return joinParts([postalCode, city], ", ") || city || venueName || fallback;
};

export const getEventAddressLabel = (event: EventLocationLike, fallback = "") => {
  const address = normalizePart(event.address);

  if (address.length > 0) {
    return address;
  }

  return getEventLocationLabel(event, fallback);
};

export const getEventCalendarLocation = (event: EventLocationLike, fallback = "") =>
  getEventDirectionsQuery(event, getEventLocationLabel(event, fallback));