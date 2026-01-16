<template>
  <section class="mx-auto max-w-5xl px-6 py-16">
    <slot name="header" />

    <div v-if="isLoading" class="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
      Chargement de l'événement…
    </div>
    <div v-else-if="!detailEvent" class="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-slate-500">
      Événement introuvable.
    </div>
    <div v-else class="mt-6 grid gap-8" data-testid="event-detail">
      <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <img
          class="h-80 w-full object-cover"
          :src="getEventImage(detailEvent)"
          :alt="detailEvent.title"
          @error="markImageError(detailEvent.id)"
        />
        <div class="p-8">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
            {{ formatDateTimeRange(detailEvent.eventStartAt, detailEvent.eventEndAt) }}
          </p>
          <h2 class="mt-3 text-3xl font-semibold text-slate-900">{{ detailEvent.title }}</h2>
          <p class="mt-2 text-base text-slate-600">
            {{ detailEvent.venueName }} · {{ detailEvent.city }}
          </p>

          <p class="mt-6 whitespace-pre-line text-sm text-slate-600">
            {{ formatOptional(detailEvent.content) }}
          </p>

          <div class="mt-6 grid gap-2 text-sm text-slate-600">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Informations pratiques</p>
            <p><span class="font-medium text-slate-700">Organisateur:</span> {{ formatOptional(detailEvent.organizerName) }}</p>
            <p><span class="font-medium text-slate-700">Adresse:</span> {{ formatOptional(detailEvent.address) }}</p>
            <p><span class="font-medium text-slate-700">Code postal:</span> {{ formatOptional(detailEvent.postalCode) }}</p>
            <p><span class="font-medium text-slate-700">Email:</span> {{ formatOptional(detailEvent.contactEmail) }}</p>
            <p><span class="font-medium text-slate-700">Téléphone:</span> {{ formatOptional(detailEvent.contactPhone) }}</p>
            <p><span class="font-medium text-slate-700">Site organisateur:</span> {{ formatOptional(detailEvent.organizerUrl) }}</p>
            <p><span class="font-medium text-slate-700">Billetterie:</span> {{ formatOptional(detailEvent.ticketUrl) }}</p>
            <p><span class="font-medium text-slate-700">Site web:</span> {{ formatOptional(detailEvent.websiteUrl) }}</p>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <a
              class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
              :href="buildDirectionsUrl(detailEvent)"
              target="_blank"
              rel="noopener noreferrer"
            >
              Itinéraire
            </a>
            <a
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
              :href="buildCalendarUrl(detailEvent)"
              download="evenement.ics"
            >
              Ajouter au calendrier
            </a>
          </div>
        </div>
      </div>

      <EventMap :events="[detailEvent]" :selected-id="detailEvent.id" @select="emitSelect" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import EventMap from "../EventMap.vue";
import { useEventsStore } from "../../stores/events";

const props = defineProps<{ eventId: string }>();

const emit = defineEmits<{
  (event: "select", id: string): void;
}>();

const eventsStore = useEventsStore();
const { isLoading } = storeToRefs(eventsStore);

const detailEvent = computed(() => eventsStore.getEventById(props.eventId));

const {
  getEventImage,
  markImageError,
  formatDateTimeRange,
  formatOptional,
  buildDirectionsUrl,
  buildCalendarUrl
} = eventsStore;

const emitSelect = (id: string) => {
  emit("select", id);
};
</script>
