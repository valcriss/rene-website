<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-medium">Réglages du site</h2>
      <span class="text-sm text-slate-500">Rôle requis: administrateur</span>
    </div>

    <div v-if="!isAdmin" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les réglages.
      </p>
    </div>

    <div v-else class="mt-6 grid gap-8">
      <div v-if="adminError" class="rounded-xl bg-rose-50 p-4 text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="text-slate-500">Chargement de l'administration…</div>

      <div v-else class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="admin-settings-form">
        <h3 class="text-lg font-semibold text-slate-900">Réglages</h3>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label class="text-sm text-slate-600">
            Email de contact
            <input
              v-model="adminSettingsForm.contactEmail"
              type="email"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="contact@rene-website.fr"
            />
          </label>
          <label class="text-sm text-slate-600">
            Téléphone
            <input
              v-model="adminSettingsForm.contactPhone"
              type="text"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="01 02 03 04 05"
            />
          </label>
          <label class="text-sm text-slate-600 md:col-span-2">
            Intro page d'accueil
            <textarea
              v-model="adminSettingsForm.homepageIntro"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows="3"
            ></textarea>
          </label>
        </div>
        <div class="mt-4 flex gap-3">
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            @click="handleSaveAdminSettings"
          >
            Enregistrer les réglages
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAuthStore } from "../../stores/auth";
import { useAdminStore } from "../../stores/admin";

const authStore = useAuthStore();
const adminStore = useAdminStore();

const { isAdmin } = storeToRefs(authStore);
const { adminError, adminLoading, adminSettingsForm } = storeToRefs(adminStore);

const { handleSaveAdminSettings } = adminStore;
</script>
