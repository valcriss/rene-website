import { randomUUID } from "node:crypto";
import { CommuneRepository } from "./repository";
import { Commune } from "./types";

const SEARCH_RESULTS_LIMIT = 20;

export const createInMemoryCommuneRepository = (): CommuneRepository => {
  let communes: Commune[] = [];

  return {
    count: async () => communes.length,
    bulkInsert: async (input) => {
      communes = communes.concat(input.map((commune) => ({ ...commune, id: randomUUID() })));
    },
    findByPostalCode: async (postalCode) =>
      communes
        .filter((commune) => commune.codePostal === postalCode)
        .sort((a, b) => a.nomCommune.localeCompare(b.nomCommune)),
    search: async (query) => {
      const normalized = query.trim().toLowerCase();
      return communes
        .filter((commune) => commune.nomCommune.toLowerCase().includes(normalized))
        .sort((a, b) => a.nomCommune.localeCompare(b.nomCommune))
        .slice(0, SEARCH_RESULTS_LIMIT);
    }
  };
};
