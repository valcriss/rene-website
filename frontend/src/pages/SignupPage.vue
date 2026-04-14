<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">{{ t("signup.eyebrow") }}</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">{{ t("signup.title") }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("signup.lead") }}
      </p>

      <div class="mt-6 grid gap-4">
        <label class="text-sm text-slate-600">
          {{ t("common.name") }}
          <input
            v-model="signupName"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("common.email") }}
          <input
            v-model="signupEmail"
            type="email"
            :placeholder="t('login.placeholderEmail')"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("login.password") }}
          <input
            v-model="signupPassword"
            type="password"
            placeholder="********"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("signup.passwordConfirmation") }}
          <input
            v-model="signupPasswordConfirmation"
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
          @click="handleSignup"
        >
          {{ t("signup.submit") }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToLogin"
        >
          {{ t("signup.backToLogin") }}
        </button>
        <span v-if="authError" class="text-sm text-rose-600">{{ authError }}</span>
      </div>

      <div class="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <p>{{ t("signup.alreadyAccount") }}</p>
        <button
          type="button"
          class="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          @click="goToLogin"
        >
          {{ t("common.login") }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const { signupName, signupEmail, signupPassword, signupPasswordConfirmation, authError } = storeToRefs(authStore);

const handleSignup = async () => {
  authError.value = null;

  try {
    await authStore.signupWithPassword();
    authStore.resetSignupForm();
    router.push("/backoffice");
  } catch (error) {
    authError.value = error instanceof Error ? error.message : t("signup.errorFallback");
  }
};

const goToLogin = () => {
  router.push("/login");
};
</script>
