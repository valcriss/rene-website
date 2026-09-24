<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-3xl px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">{{ t("legalNotice.eyebrow") }}</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">{{ t("legalNotice.title") }}</h1>

      <p v-if="legalNotice" class="mt-6 whitespace-pre-line text-sm leading-6 text-slate-700">{{ legalNotice }}</p>
      <p v-else class="mt-6 text-sm text-slate-500">{{ t("legalNotice.empty") }}</p>

      <div class="mt-8">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToHome"
        >
          {{ t("legalNotice.backToHome") }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onServerPrefetch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useSettingsStore } from "../stores/settings";
import { usePageSeo } from "../composables/usePageSeo";
import { buildPlainTextDescription } from "../utils/seo";

const router = useRouter();
const { t } = useI18n();
const settingsStore = useSettingsStore();
const { legalNotice } = storeToRefs(settingsStore);

onMounted(() => {
  settingsStore.loadPublicSettings();
});

// onMounted never runs during SSR; without this, the legal notice text (and its meta
// description below) would always render empty for crawlers.
onServerPrefetch(() => settingsStore.loadPublicSettings());

usePageSeo({
  title: () => `${t("legalNotice.title")} — ${t("navigation.title")}`,
  description: () => buildPlainTextDescription(legalNotice.value) || t("legalNotice.empty")
});

const goToHome = () => {
  router.push("/");
};
</script>
