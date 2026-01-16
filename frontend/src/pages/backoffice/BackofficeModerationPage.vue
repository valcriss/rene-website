<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-medium">Modération</h2>
      <span class="text-sm text-slate-500">Rôle requis: modérateur ou admin</span>
    </div>

    <div v-if="!canModerate" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour modérer les événements.
      </p>
    </div>

    <template v-else>
      <div v-if="moderationError" class="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">
        {{ moderationError }}
      </div>

      <div v-if="pendingEvents.length === 0" class="mt-6 text-slate-500">
        Aucun événement en attente de modération.
      </div>
      <ul v-else class="mt-6 grid gap-4">
        <li
          v-for="eventItem in pendingEvents"
          :key="eventItem.id"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.2em] text-slate-400">
                {{ formatDate(eventItem.eventStartAt) }}
              </p>
              <h3 class="mt-2 text-lg font-semibold text-slate-900">{{ eventItem.title }}</h3>
              <p class="mt-1 text-sm text-slate-600">
                {{ eventItem.venueName }} · {{ eventItem.city }}
              </p>
            </div>
            <div class="flex flex-1 flex-col gap-3 md:max-w-md">
              <input
                v-model="rejectionReasons[eventItem.id]"
                type="text"
                placeholder="Motif de refus"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  @click="openModerationView(eventItem.id)"
                >
                  Voir la publication
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-emerald-500 px-3 py-2 text-sm text-white"
                  @click="handlePublish(eventItem.id)"
                >
                  Publier
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white"
                  @click="handleReject(eventItem.id)"
                >
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </template>
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
