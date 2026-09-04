import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchPublicSettings } from "../api/settings";

export const useSettingsStore = defineStore("settings", () => {
  const homepageIntro = ref<string | null>(null);
  const homepageSubtitle = ref<string | null>(null);
  const loading = ref(false);
  const hasLoaded = ref(false);

  const loadPublicSettings = async () => {
    if (loading.value || hasLoaded.value) return;
    loading.value = true;
    try {
      const settings = await fetchPublicSettings();
      homepageIntro.value = settings.homepageIntro;
      homepageSubtitle.value = settings.homepageSubtitle;
      hasLoaded.value = true;
    } catch {
      homepageIntro.value = null;
      homepageSubtitle.value = null;
    } finally {
      loading.value = false;
    }
  };

  return {
    homepageIntro,
    homepageSubtitle,
    loading,
    hasLoaded,
    loadPublicSettings
  };
});
