<template>
  <EventDetailView :event-id="detailEventId" :event="moderationEvent" @select="openModerationDetail">
    <template #header>
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ $t("moderation.previewEyebrow") }}</p>
            <p class="text-base font-semibold text-slate-900">{{ $t("moderation.previewTitle") }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
            @click="goToModeration"
          >
            {{ $t("moderation.backToModeration") }}
          </button>
        </div>
      </div>
    </template>
  </EventDetailView>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import EventDetailView from "../../components/events/EventDetailView.vue";
import { useEventsStore } from "../../stores/events";

const route = useRoute();
const router = useRouter();
const eventsStore = useEventsStore();

const detailEventId = computed(() => String(route.params.id));
const moderationEvent = computed(() => eventsStore.getModerationEventById(detailEventId.value));

const goToModeration = () => {
  router.push("/backoffice/moderation");
};

const openModerationDetail = (id: string) => {
  router.push(`/backoffice/moderation/view/${id}`);
};
</script>
