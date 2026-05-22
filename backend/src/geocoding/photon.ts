import { GeolocationPrecision } from "../events/types";

export type GeocodeInput = {
  address?: string;
  venueName: string;
  postalCode: string;
  city: string;
};

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  geolocationPrecision: GeolocationPrecision;
};

type PhotonGeometry = {
  coordinates?: [number, number];
};

type PhotonFeature = {
  geometry?: PhotonGeometry;
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

const getPhotonBaseUrl = () => {
  const value = process.env.PHOTON_URL?.trim();
  return value && value.length > 0 ? value.replace(/\/$/, "") : "http://localhost:2322";
};

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;

const buildPhotonQueryFromParts = (parts: Array<string | undefined>) =>
  parts
    .filter((value): value is string => isNonEmptyString(value))
    .map((value) => value.trim())
    .join(" ");

export const buildPhotonQueries = (input: GeocodeInput): Array<{
  query: string;
  geolocationPrecision: GeolocationPrecision;
}> => {
  const attempts = [
    {
      query: buildPhotonQueryFromParts([input.address, input.postalCode, input.city]),
      geolocationPrecision: "EXACT" as GeolocationPrecision
    },
    {
      query: buildPhotonQueryFromParts([input.address, input.venueName, input.postalCode, input.city]),
      geolocationPrecision: "EXACT" as GeolocationPrecision
    },
    {
      query: buildPhotonQueryFromParts([input.venueName, input.postalCode, input.city]),
      geolocationPrecision: "APPROXIMATE" as GeolocationPrecision
    },
    {
      query: buildPhotonQueryFromParts([input.postalCode, input.city]),
      geolocationPrecision: "APPROXIMATE" as GeolocationPrecision
    },
    {
      query: buildPhotonQueryFromParts([input.city]),
      geolocationPrecision: "APPROXIMATE" as GeolocationPrecision
    }
  ];

  return attempts.filter((attempt, index, all) =>
    attempt.query.length > 0 && all.findIndex((candidate) => candidate.query === attempt.query) === index
  );
};

export const buildPhotonQuery = (input: GeocodeInput) =>
  buildPhotonQueryFromParts([input.address, input.venueName, input.postalCode, input.city]);

export const geocodeAddress = async (query: string): Promise<{ latitude: number; longitude: number } | null> => {
  const baseUrl = getPhotonBaseUrl();
  const url = `${baseUrl}/api?q=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Photon request failed with status ${response.status}`);
  }

  const data = (await response.json()) as PhotonResponse;
  const first = data.features?.[0];
  const coordinates = first?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

export const geocodeEventLocation = async (
  input: GeocodeInput
): Promise<GeocodeResult | null> => {
  const attempts = buildPhotonQueries(input);
  for (const attempt of attempts) {
    const coordinates = await geocodeAddress(attempt.query);
    if (coordinates) {
      return {
        ...coordinates,
        geolocationPrecision: attempt.geolocationPrecision
      };
    }
  }

  return null;
};
