export type GeocodeResult = {
  latitude: number;
  longitude: number;
};

export type GeocodeInput = {
  address: string;
  postalCode: string;
  city: string;
  venueName: string;
};

const parseApiError = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { errors?: string[]; message?: string };
    if (data.errors && data.errors.length > 0) {
      return data.errors.join(" · ");
    }
    if (data.message) {
      return data.message;
    }
  } catch {
    // ignore parsing errors
  }
  return fallback;
};

export const geocodeEventLocation = async (input: GeocodeInput): Promise<GeocodeResult> => {
  const params = new URLSearchParams({
    address: input.address,
    postalCode: input.postalCode,
    city: input.city,
    venueName: input.venueName
  });
  const response = await fetch(`/api/geocoding?${params.toString()}`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Adresse introuvable."));
  }
  return response.json() as Promise<GeocodeResult>;
};
