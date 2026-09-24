<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16 text-center">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">{{ t("notFound.eyebrow") }}</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">{{ t("notFound.title") }}</h1>
      <p class="mt-2 text-sm text-slate-500">{{ t("notFound.description") }}</p>

      <div class="mt-6 flex justify-center">
        <RouterLink
          to="/"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        >
          {{ t("notFound.backToAgenda") }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";

const { t } = useI18n();
</script>
