import { defineStore } from "pinia";
import { ref } from "vue";
import { Category, fetchCategories } from "../api/categories";

export const useCategoriesStore = defineStore("categories", () => {
  const categories = ref<Category[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasLoaded = ref(false);

  const loadCategories = async () => {
    if (loading.value || hasLoaded.value) return;
    loading.value = true;
    error.value = null;
    try {
      categories.value = await fetchCategories();
      hasLoaded.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur inconnue";
    } finally {
      loading.value = false;
    }
  };

  return {
    categories,
    loading,
    error,
    hasLoaded,
    loadCategories
  };
});
