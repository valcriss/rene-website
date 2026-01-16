<template>
  <section class="grid gap-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-medium">Mes événements</h2>
        <span class="text-sm text-slate-500">Rôle requis: rédacteur, modérateur ou admin</span>
      </div>
      <button
        type="button"
        class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        @click="goToCreate"
      >
        Ajouter un événement
      </button>
    </div>

    <div v-if="!canEdit" class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les événements.
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-900">Brouillons & retours</h3>
        <p class="mt-1 text-sm text-slate-500">
          {{ editableEvents.length }} événements en cours
        </p>
        <div v-if="editableEvents.length === 0" class="mt-4 text-slate-500">
          Aucun brouillon ou retour à traiter.
        </div>
        <ul v-else class="mt-4 grid gap-4">
          <li
            v-for="eventItem in editableEvents"
            :key="eventItem.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ eventItem.status }}</p>
                <h4 class="mt-2 text-lg font-semibold text-slate-900">{{ eventItem.title }}</h4>
                <p class="mt-1 text-sm text-slate-600">
                  {{ eventItem.venueName }} · {{ eventItem.city }}
                </p>
                <p v-if="eventItem.rejectionReason" class="mt-2 text-sm text-rose-600">
                  Motif: {{ eventItem.rejectionReason }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  @click="editEvent(eventItem)"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-emerald-500 px-3 py-2 text-sm text-white"
                  @click="handleSubmitDraft(eventItem.id)"
                >
                  Soumettre
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useEditorStore } from "../../stores/editor";
import { useEventsStore } from "../../stores/events";
import type { EventItem } from "../../api/events";

const router = useRouter();
const authStore = useAuthStore();
const editorStore = useEditorStore();
const eventsStore = useEventsStore();

const { canEdit } = storeToRefs(authStore);
const { editableEvents } = storeToRefs(eventsStore);
const { handleSubmitDraft } = editorStore;

const goToCreate = () => {
  router.push("/backoffice/events/new");
};

const editEvent = (eventItem: EventItem) => {
  editorStore.startEdit(eventItem);
  router.push("/backoffice/events/new");
};
</script>
