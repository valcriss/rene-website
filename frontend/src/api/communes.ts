export type Commune = {
  id: string;
  codeInsee: string;
  codePostal: string;
  nomCommune: string;
  libelleAcheminement: string;
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

export const fetchCommunesByPostalCode = async (postalCode: string): Promise<Commune[]> => {
  const params = new URLSearchParams({ postalCode });
  const response = await fetch(`/api/communes?${params.toString()}`);
  if (!response.ok) {
    throw new Error(await parseApiError(response, "Impossible de charger les communes."));
  }
  return response.json() as Promise<Commune[]>;
};
