<template>
  <NavigationHeader :show-login="false" />

  <EventDetailView :event-id="previewEvent?.id ?? 'preview-event'" :event="previewEvent">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-sky-900 shadow-sm transition hover:bg-sky-50"
          @click="goToEditor"
        >
          <span>{{ t("editor.backToEditor") }}</span>
        </button>
        <span class="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
          {{ t("editor.previewBadge") }}
        </span>
      </div>
    </template>
  </EventDetailView>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../../components/navigation/Header.vue";
import EventDetailView from "../../components/events/EventDetailView.vue";
import { useCategoriesStore } from "../../stores/categories";
import { readEditorPreviewSnapshot } from "../../stores/editor";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const categoriesStore = useCategoriesStore();

const previewToken = computed(() => String(route.query.preview ?? ""));
const previewSnapshot = computed(() => readEditorPreviewSnapshot(previewToken.value));
const previewEvent = computed(() => previewSnapshot.value?.event ?? null);

onMounted(() => {
  categoriesStore.loadCategories();
});

const goToEditor = () => {
  router.push("/backoffice/events/new");
};
</script>
