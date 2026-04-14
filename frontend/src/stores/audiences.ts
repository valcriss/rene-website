import { defineStore } from "pinia";
import { ref } from "vue";
import { Audience, fetchAudiences } from "../api/audiences";

export const useAudiencesStore = defineStore("audiences", () => {
  const audiences = ref<Audience[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasLoaded = ref(false);

  const loadAudiences = async () => {
    if (loading.value || hasLoaded.value) return;
    loading.value = true;
    error.value = null;
    try {
      audiences.value = await fetchAudiences();
      hasLoaded.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur inconnue";
    } finally {
      loading.value = false;
    }
  };

  return {
    audiences,
    loading,
    error,
    hasLoaded,
    loadAudiences
  };
});