import { ref } from "vue";
import { defineStore } from "pinia";
import {
  CategorySubscription,
  fetchCategorySubscriptions,
  updateCategorySubscription
} from "../api/subscriptions";
import { useAuthStore } from "./auth";

export const useSubscriptionsStore = defineStore("subscriptions", () => {
  const categorySubscriptions = ref<CategorySubscription[]>([]);
  const subscriptionsLoading = ref(false);
  const subscriptionsError = ref<string | null>(null);

  const loadCategorySubscriptions = async () => {
    subscriptionsError.value = null;
    subscriptionsLoading.value = true;
    const authStore = useAuthStore();
    try {
      categorySubscriptions.value = await fetchCategorySubscriptions(authStore.role);
    } catch (error) {
      subscriptionsError.value = error instanceof Error ? error.message : "Erreur inconnue";
    } finally {
      subscriptionsLoading.value = false;
    }
  };

  const toggleCategorySubscription = async (categoryId: string, subscribed: boolean) => {
    subscriptionsError.value = null;
    const authStore = useAuthStore();
    const target = categorySubscriptions.value.find((category) => category.id === categoryId);
    const previous = target?.subscribed ?? subscribed;
    if (target) {
      target.subscribed = subscribed;
    }

    try {
      await updateCategorySubscription(authStore.role, categoryId, subscribed);
    } catch (error) {
      if (target) {
        target.subscribed = previous;
      }
      subscriptionsError.value = error instanceof Error ? error.message : "Erreur inconnue";
    }
  };

  return {
    categorySubscriptions,
    subscriptionsLoading,
    subscriptionsError,
    loadCategorySubscriptions,
    toggleCategorySubscription
  };
});
