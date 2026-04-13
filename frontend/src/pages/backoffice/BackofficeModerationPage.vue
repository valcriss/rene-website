<template>
  <section class="grid gap-6">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
        <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">File de traitement</p>
        <h2 class="mt-3 text-2xl font-semibold text-slate-950">Modération</h2>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Une file pensée pour lire rapidement, décider clairement et distinguer sans ambiguïté les actions de validation des actions secondaires.
        </p>
      </div>
      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)]">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Suivi</p>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-5 text-center">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">En attente</p>
            <p class="mt-2 text-3xl font-semibold text-slate-950">{{ pendingEvents.length }}</p>
          </div>
          <div class="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-5 text-center">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">Rôle requis</p>
            <p class="mt-2 text-sm font-semibold text-slate-950">Modérateur ou admin</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!canModerate" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour modérer les événements.
      </p>
    </div>

    <div v-else class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Demandes reçues</p>
          <h3 class="mt-2 text-xl font-semibold text-slate-950">Événements en attente</h3>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            Chaque fiche affiche l’essentiel pour décider vite, avec le motif de refus disponible au même niveau que les actions.
          </p>
        </div>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
          {{ pendingEvents.length }} demande<span v-if="pendingEvents.length > 1">s</span>
        </span>
      </div>

      <div v-if="moderationError" class="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ moderationError }}
      </div>

      <div v-if="pendingEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
        Aucun événement en attente de modération.
      </div>
      <ul v-else class="mt-6 grid gap-4">
        <li
          v-for="eventItem in pendingEvents"
          :key="eventItem.id"
          class="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5"
        >
          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                  En attente
                </span>
                <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                  {{ formatDate(eventItem.eventStartAt) }}
                </span>
              </div>
              <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
              <p class="mt-2 text-sm text-slate-600">
                {{ eventItem.venueName }} · {{ eventItem.city }}
              </p>
              <p class="mt-4 text-sm leading-6 text-slate-500">
                Vérifiez le rendu public, puis publiez ou refusez avec un motif clair pour le rédacteur.
              </p>
            </div>

            <div class="rounded-[1.35rem] border border-slate-200 bg-white p-4">
              <label class="block text-sm text-slate-600">
                Motif de refus
                <input
                  v-model="rejectionReasons[eventItem.id]"
                  type="text"
                  placeholder="Motif de refus"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </label>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                  @click="openModerationView(eventItem.id)"
                >
                  Voir la publication
                </button>
                <button
                  type="button"
                  class="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  @click="handlePublish(eventItem.id)"
                >
                  Publier
                </button>
                <button
                  type="button"
                  class="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                  @click="handleReject(eventItem.id)"
                >
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useEventsStore } from "../../stores/events";

const authStore = useAuthStore();
const eventsStore = useEventsStore();
const router = useRouter();

const { canModerate } = storeToRefs(authStore);
const { pendingEvents, rejectionReasons, moderationError } = storeToRefs(eventsStore);
const { handlePublish, handleReject, formatDate } = eventsStore;

const openModerationView = (id: string) => {
  router.push(`/backoffice/moderation/view/${id}`);
};
</script>
