<template>
  <section class="grid gap-6">
    <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
      <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">Administration</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-950">Réglages du site</h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Un écran de configuration assumé, avec les paramètres de contact et le texte d’introduction regroupés dans une vraie surface de gestion.
      </p>
    </div>

    <div v-if="!isAdmin" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les réglages.
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div v-if="adminError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
        Chargement de l'administration…
      </div>

      <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]" data-testid="admin-settings-form">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Configuration</p>
          <h3 class="mt-2 text-lg font-semibold text-slate-950">Paramètres éditoriaux</h3>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label class="text-sm text-slate-600">
              Email de contact
              <input
                v-model="adminSettingsForm.contactEmail"
                type="email"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="contact@rene-website.fr"
              />
            </label>
            <label class="text-sm text-slate-600">
              Téléphone
              <input
                v-model="adminSettingsForm.contactPhone"
                type="text"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="01 02 03 04 05"
              />
            </label>
            <label class="text-sm text-slate-600 md:col-span-2">
              Intro page d'accueil
              <textarea
                v-model="adminSettingsForm.homepageIntro"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                rows="5"
              ></textarea>
            </label>
          </div>
          <div class="mt-5 flex gap-3">
            <button
              type="button"
              class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              @click="handleSaveAdminSettings"
            >
              Enregistrer les réglages
            </button>
          </div>
        </div>

        <aside class="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.16)]">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Repères</p>
          <div class="mt-4 grid gap-3">
            <div class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
              <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">Contacts</p>
              <p class="mt-2 text-sm text-slate-700">Informations visibles ou réutilisées dans les interfaces publiques.</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">Éditorial</p>
              <p class="mt-2 text-sm text-slate-700">Le texte d’introduction structure l’accueil et donne le ton de la plateforme.</p>
            </div>
          </div>
        </aside>
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
