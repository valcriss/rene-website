import { defineStore } from "pinia";
import { ref } from "vue";
import { Commune, fetchCommunesByPostalCode } from "../api/communes";

const POSTAL_CODE_PATTERN = /^\d{5}$/;

export const useCommunesStore = defineStore("communes", () => {
  const resultsByPostalCode = ref<Record<string, Commune[]>>({});
  const loadingPostalCodes = ref<Record<string, boolean>>({});
  const errorsByPostalCode = ref<Record<string, string>>({});

  const searchByPostalCode = async (postalCode: string): Promise<Commune[]> => {
    const normalized = postalCode.trim();
    if (!POSTAL_CODE_PATTERN.test(normalized)) {
      return [];
    }

    const cached = resultsByPostalCode.value[normalized];
    if (cached) {
      return cached;
    }

    loadingPostalCodes.value[normalized] = true;
    delete errorsByPostalCode.value[normalized];

    try {
      const communes = await fetchCommunesByPostalCode(normalized);
      resultsByPostalCode.value[normalized] = communes;
      return communes;
    } catch (err) {
      errorsByPostalCode.value[normalized] = err instanceof Error ? err.message : "Erreur inconnue";
      return [];
    } finally {
      delete loadingPostalCodes.value[normalized];
    }
  };

  const getResults = (postalCode: string): Commune[] => resultsByPostalCode.value[postalCode.trim()] ?? [];
  const isLoading = (postalCode: string): boolean => Boolean(loadingPostalCodes.value[postalCode.trim()]);
  const getError = (postalCode: string): string | null => errorsByPostalCode.value[postalCode.trim()] ?? null;

  return {
    resultsByPostalCode,
    searchByPostalCode,
    getResults,
    isLoading,
    getError
  };
});
