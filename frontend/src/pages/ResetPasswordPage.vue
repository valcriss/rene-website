<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">{{ t("resetPassword.eyebrow") }}</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">{{ t("resetPassword.title") }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("resetPassword.lead") }}
      </p>

      <div class="mt-6 grid gap-4">
        <label class="text-sm text-slate-600">
          {{ t("resetPassword.password") }}
          <input
            v-model="passwordResetNewPassword"
            type="password"
            placeholder="********"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("resetPassword.passwordConfirmation") }}
          <input
            v-model="passwordResetPasswordConfirmation"
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
          @click="handleSubmit"
        >
          {{ t("resetPassword.submit") }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToLogin"
        >
          {{ t("resetPassword.backToLogin") }}
        </button>
        <span v-if="passwordResetError" class="text-sm text-rose-600">{{ passwordResetError }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const {
  passwordResetToken,
  passwordResetNewPassword,
  passwordResetPasswordConfirmation,
  passwordResetError
} = storeToRefs(authStore);

watch(
  () => route.query.token,
  (token) => {
    passwordResetToken.value = typeof token === "string" ? token : "";
  },
  { immediate: true }
);

const handleSubmit = async () => {
  passwordResetError.value = null;

  try {
    await authStore.confirmPasswordReset();
    authStore.resetPasswordResetForm();
    router.push("/login");
  } catch (error) {
    passwordResetError.value = error instanceof Error ? error.message : t("resetPassword.errorFallback");
  }
};

const goToLogin = () => {
  router.push("/login");
};
</script>