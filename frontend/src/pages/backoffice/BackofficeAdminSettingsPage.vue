<template>
  <section class="grid gap-6">
    <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
      <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ t("admin.title") }}</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-950">{{ t("admin.settingsTitle") }}</h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {{ t("admin.settingsLead") }}
      </p>
    </div>

    <div v-if="!isAdmin" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">{{ t("common.accessDenied") }}</h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("admin.deniedSettings") }}
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div v-if="adminError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
        <LoadingSpinner size="sm" />
        <span>{{ t("admin.loading") }}</span>
      </div>

      <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]" data-testid="admin-settings-form">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("admin.configuration") }}</p>
          <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("admin.editorialSettings") }}</h3>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label class="text-sm text-slate-600">
              {{ t("admin.contactEmail") }}
              <input v-model="adminSettingsForm.contactEmail" type="email" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="contact@rene-website.fr" />
            </label>
            <label class="text-sm text-slate-600">
              {{ t("common.phone") }}
              <input v-model="adminSettingsForm.contactPhone" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="01 02 03 04 05" />
            </label>
            <label class="text-sm text-slate-600 md:col-span-2">
              {{ t("admin.homepageIntro") }}
              <textarea v-model="adminSettingsForm.homepageIntro" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" rows="5"></textarea>
            </label>
          </div>
          <div class="mt-5 flex gap-3">
            <button type="button" class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800" @click="handleSaveAdminSettings">
              {{ t("admin.saveSettings") }}
            </button>
          </div>
        </div>

        <aside class="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.16)]">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("admin.guideposts") }}</p>
          <div class="mt-4 grid gap-3">
            <div class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
              <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("admin.contacts") }}</p>
              <p class="mt-2 text-sm text-slate-700">{{ t("admin.contactsLead") }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("admin.editorial") }}</p>
              <p class="mt-2 text-sm text-slate-700">{{ t("admin.editorialLead") }}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
import { useAdminStore } from "../../stores/admin";
import LoadingSpinner from "../../components/LoadingSpinner.vue";

const authStore = useAuthStore();
const adminStore = useAdminStore();
const { t } = useI18n();

const { isAdmin } = storeToRefs(authStore);
const { adminError, adminLoading, adminSettingsForm } = storeToRefs(adminStore);
const { handleSaveAdminSettings } = adminStore;
</script>
