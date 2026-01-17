export type GeocodeInput = {
  address?: string;
  venueName: string;
  postalCode: string;
  city: string;
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

export const buildPhotonQuery = (input: GeocodeInput) => {
  const parts = [input.address, input.venueName, input.postalCode, input.city]
    .filter((value): value is string => isNonEmptyString(value))
    .map((value) => value.trim());
  return parts.join(" ");
};

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
): Promise<{ latitude: number; longitude: number } | null> => {
  const query = buildPhotonQuery(input);
  if (!query) {
    return null;
  }
  return geocodeAddress(query);
};
