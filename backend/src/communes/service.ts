import { CommuneRepository } from "./repository";
import { Commune } from "./types";

export type SearchCommunesParams = {
  postalCode?: string;
  q?: string;
};

type SearchResult =
  | { ok: true; value: Commune[] }
  | { ok: false; errors: string[] };

export const searchCommunes = async (
  repo: CommuneRepository,
  params: SearchCommunesParams
): Promise<SearchResult> => {
  const postalCode = params.postalCode?.trim();
  const query = params.q?.trim();

  if (!postalCode && !query) {
    return { ok: false, errors: ["Le code postal ou le nom de la commune est requis."] };
  }

  if (postalCode) {
    return { ok: true, value: await repo.findByPostalCode(postalCode) };
  }

  return { ok: true, value: await repo.search(query as string) };
};
