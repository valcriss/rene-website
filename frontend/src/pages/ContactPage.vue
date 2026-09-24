<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">{{ t("contact.eyebrow") }}</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">{{ t("contact.title") }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("contact.lead") }}
      </p>

      <div class="mt-6 grid gap-4">
        <label class="text-sm text-slate-600">
          {{ t("contact.name") }}
          <input
            v-model="contactName"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("contact.email") }}
          <input
            v-model="contactEmail"
            type="email"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          {{ t("contact.message") }}
          <textarea
            v-model="contactMessage"
            rows="5"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          ></textarea>
        </label>
        <label class="hidden" aria-hidden="true">
          Website
          <input v-model="contactHoneypot" type="text" tabindex="-1" autocomplete="off" />
        </label>
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          @click="handleSubmit"
        >
          {{ t("contact.submit") }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToHome"
        >
          {{ t("contact.backToHome") }}
        </button>
        <span v-if="contactError" class="text-sm text-rose-600">{{ contactError }}</span>
        <span v-if="contactSent" class="text-sm text-emerald-600">{{ t("contact.success") }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useContactStore } from "../stores/contact";

const router = useRouter();
const { t } = useI18n();
const contactStore = useContactStore();
const { contactName, contactEmail, contactMessage, contactHoneypot, contactError, contactSent } =
  storeToRefs(contactStore);

const handleSubmit = async () => {
  contactError.value = null;

  try {
    await contactStore.submitContactMessage();
  } catch (error) {
    contactError.value = error instanceof Error ? error.message : t("contact.errorFallback");
  }
};

const goToHome = () => {
  router.push("/");
};
</script>
