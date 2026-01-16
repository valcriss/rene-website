<template>
  <EventDetailView :event-id="detailEventId" @select="openModerationDetail">
    <template #header>
      <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Modération</p>
            <p class="text-base font-semibold text-slate-900">Prévisualisation de la publication</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
            @click="goToModeration"
          >
            Retour à la modération
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

const route = useRoute();
const router = useRouter();

const detailEventId = computed(() => String(route.params.id));

const goToModeration = () => {
  router.push("/backoffice/moderation");
};

const openModerationDetail = (id: string) => {
  router.push(`/backoffice/moderation/view/${id}`);
};
</script>
