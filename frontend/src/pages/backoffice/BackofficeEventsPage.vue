<template>
  <section class="grid gap-8">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
        <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">Mes événements</p>
        <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Votre espace de pilotage éditorial</h3>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Retrouvez vos brouillons, vos retours de modération et vos publications dans une vue plus nette,
          pensée pour reprendre rapidement le bon sujet au bon moment.
        </p>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)]">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Actions prioritaires</p>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            @click="goToCreate"
          >
            Ajouter un événement
          </button>
          <button
            v-if="lastEditableEvent"
            type="button"
            class="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
            @click="editEvent(lastEditableEvent)"
          >
            Reprendre un brouillon
          </button>
        </div>
        <div class="mt-5 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-4">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">En cours</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">{{ editableEvents.length }}</p>
          </div>
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-4">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">Publiés</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">{{ publishedBackofficeEvents.length }}</p>
          </div>
          <div class="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-4">
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">Retours</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950">{{ rejectedEventsCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!canEdit" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les événements.
      </p>
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Brouillons et retours</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">Reprises éditoriales</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              Les événements à finaliser ou à corriger avant publication.
            </p>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
            {{ editableEvents.length }} élément<span v-if="editableEvents.length > 1">s</span>
          </span>
        </div>

        <div v-if="editableEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          Aucun brouillon ou retour à traiter.
        </div>
        <ul v-else class="mt-6 grid gap-4">
          <li
            v-for="eventItem in editableEvents"
            :key="eventItem.id"
            class="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5"
          >
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" :class="statusClasses(eventItem.status)">
                      {{ statusLabels[eventItem.status] ?? eventItem.status }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {{ formatDate(eventItem.eventStartAt) }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
                  <p class="mt-2 text-sm text-slate-600">
                    {{ eventItem.venueName }} · {{ eventItem.city }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                    @click="editEvent(eventItem)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    @click="handleSubmitDraft(eventItem.id)"
                  >
                    Soumettre
                  </button>
                </div>
              </div>
              <p v-if="eventItem.rejectionReason" class="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Motif : {{ eventItem.rejectionReason }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Publications</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">Événements publiés</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              Les contenus déjà visibles sur le site public.
            </p>
          </div>
          <span class="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            {{ publishedBackofficeEvents.length }} publié<span v-if="publishedBackofficeEvents.length > 1">s</span>
          </span>
        </div>

        <p v-if="deleteError" class="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ deleteError }}
        </p>

        <div v-if="publishedBackofficeEvents.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          Aucun événement publié.
        </div>
        <ul v-else class="mt-6 grid gap-4">
          <li
            v-for="eventItem in publishedBackofficeEvents"
            :key="eventItem.id"
            class="rounded-[1.5rem] border border-slate-200 bg-white p-5"
          >
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" :class="statusClasses(eventItem.status)">
                      {{ statusLabels[eventItem.status] ?? eventItem.status }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {{ formatDate(eventItem.eventStartAt) }}
                    </span>
                  </div>
                  <h4 class="mt-3 text-lg font-semibold text-slate-950">{{ eventItem.title }}</h4>
                  <p class="mt-2 text-sm text-slate-600">
                    {{ eventItem.venueName }} · {{ eventItem.city }}
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                  @click="handleDelete(eventItem.id)"
                >
                  Supprimer
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
import { computed } from "vue";
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
const { editableEvents, publishedBackofficeEvents, deleteError } = storeToRefs(eventsStore);
const { handleSubmitDraft } = editorStore;
const { handleDelete, formatDate } = eventsStore;

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  REJECTED: "Retour",
  PUBLISHED: "Publié"
};

const rejectedEventsCount = computed(
  () => editableEvents.value.filter((eventItem) => eventItem.status === "REJECTED").length
);

const lastEditableEvent = computed(() => editableEvents.value[0] ?? null);

const statusClasses = (status: string) => {
  if (status === "REJECTED") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "PUBLISHED") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border border-sky-200 bg-sky-50 text-sky-700";
};

const goToCreate = () => {
  router.push("/backoffice/events/new");
};

const editEvent = (eventItem: EventItem) => {
  editorStore.startEdit(eventItem);
  router.push("/backoffice/events/new");
};
</script>
