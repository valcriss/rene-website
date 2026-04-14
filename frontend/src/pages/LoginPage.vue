<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">{{ t("login.eyebrow") }}</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">{{ t("login.title") }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("login.lead") }}
      </p>

      <div class="mt-6 grid gap-4">
        <label v-if="isDev" class="text-sm text-slate-600">
          {{ t("login.testAccount") }}
          <select
            v-model="quickLogin"
            class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            @change="applyQuickLogin"
          >
            <option value="">{{ t("login.chooseAccount") }}</option>
            <option v-for="option in quickLoginOptions" :key="option.email" :value="option.email">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="text-sm text-slate-600">
          {{ t("common.email") }}
          <input
            v-model="email"
            type="email"
            placeholder="prenom.example.fr"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("login.password") }}
          <input
            v-model="password"
            type="password"
            placeholder="********"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          @click="handleLogin"
        >
          {{ t("login.submit") }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToHome"
        >
          {{ t("login.backToSite") }}
        </button>
        <span v-if="canEdit" class="text-sm text-emerald-600">{{ t("login.editorModerationAccess") }}</span>
        <span v-if="authError" class="text-sm text-rose-600">{{ authError }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const { email, password, canEdit, authError } = storeToRefs(authStore);
const isDev = import.meta.env.DEV;
const quickLogin = ref("");
const quickLoginOptions = [
  { label: t("login.roles.editor"), email: "editor@rene-website.local", password: "editor-rene-2026" },
  { label: t("login.roles.moderator"), email: "moderator@rene-website.local", password: "moderator-rene-2026" },
  { label: t("login.roles.admin"), email: "admin@rene-website.local", password: "admin-rene-2026" }
];

const applyQuickLogin = () => {
  const selected = quickLoginOptions.find((option) => option.email === quickLogin.value);
  if (!selected) return;
  email.value = selected.email;
  password.value = selected.password;
  authError.value = null;
};

const handleLogin = async () => {
  authError.value = null;
  try {
    await authStore.loginWithPassword();
    authStore.resetCredentials();
    router.push("/backoffice");
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "Connexion impossible";
  }
};

const goToHome = () => {
  router.push("/");
};
</script>
