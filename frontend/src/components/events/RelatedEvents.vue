<template>
  <section v-if="events.length > 0" class="space-y-5" data-testid="related-events">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">{{ $t("detail.relatedEyebrow") }}</p>
        <h2 class="font-display mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {{ $t("detail.relatedTitle") }}
        </h2>
      </div>
      <p class="text-sm text-slate-500">{{ $t("detail.relatedLead") }}</p>
    </div>

    <ul class="grid gap-5 lg:grid-cols-3">
      <li
        v-for="eventItem in events"
        :key="eventItem.id"
        class="group cursor-pointer overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white shadow-[0_20px_64px_-52px_rgba(30,41,59,0.28)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_72px_-46px_rgba(30,41,59,0.26)]"
        role="button"
        tabindex="0"
        :data-testid="`related-event-card-${eventItem.id}`"
        @click="emitSelect(eventItem.id)"
        @keydown.enter="emitSelect(eventItem.id)"
      >
        <div class="relative aspect-[16/10] overflow-hidden bg-sky-100">
          <img
            class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            :src="getEventImage(eventItem)"
            :alt="eventItem.title"
            @error="markImageError(eventItem.id)"
          />
          <div class="absolute left-4 top-4 flex flex-wrap gap-2">
            <span class="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-800 shadow-sm">
              {{ formatDateRange(eventItem.eventStartAt, eventItem.eventEndAt) }}
            </span>
            <span
              v-if="getCategoryName(eventItem.categoryId)"
              class="rounded-full px-3 py-1 text-xs font-semibold ring-1 shadow-sm"
              :style="getCategoryTheme(eventItem.categoryId)"
            >
              {{ getCategoryName(eventItem.categoryId) }}
            </span>
          </div>
        </div>

        <div class="space-y-3 p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/75">
            {{ eventItem.venueName }} · {{ eventItem.city }}
          </p>
          <h3 class="font-display text-2xl font-semibold leading-tight text-slate-950">
            {{ eventItem.title }}
          </h3>
          <p class="text-sm leading-6 text-slate-600 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
            {{ getEventExcerpt(eventItem) }}
          </p>
          <div class="border-t border-sky-100 pt-3">
            <span class="text-sm font-semibold text-slate-900">{{ $t("home.viewEvent") }}</span>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import type { EventItem } from "../../api/events";
import { useCategoriesStore } from "../../stores/categories";
import { useEventsStore } from "../../stores/events";

type CategoryTheme = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

defineProps<{ events: EventItem[] }>();

const emit = defineEmits<{
  (event: "select", id: string): void;
}>();

const categoriesStore = useCategoriesStore();
const eventsStore = useEventsStore();
const { categories } = storeToRefs(categoriesStore);

const categoryNames = computed(() =>
  new Map(categories.value.map((category) => [category.id, category.name]))
);

const categoryThemeMap: Record<string, CategoryTheme> = {
  atelier: { backgroundColor: "rgba(125, 211, 252, 0.2)", color: "#075985", borderColor: "rgba(56, 189, 248, 0.32)" },
  cinema: { backgroundColor: "rgba(129, 140, 248, 0.18)", color: "#3730a3", borderColor: "rgba(99, 102, 241, 0.28)" },
  exposition: { backgroundColor: "rgba(103, 232, 249, 0.2)", color: "#155e75", borderColor: "rgba(34, 211, 238, 0.28)" },
  festival: { backgroundColor: "rgba(167, 139, 250, 0.2)", color: "#6d28d9", borderColor: "rgba(139, 92, 246, 0.28)" },
  lecture: { backgroundColor: "rgba(186, 230, 253, 0.24)", color: "#1d4ed8", borderColor: "rgba(96, 165, 250, 0.28)" },
  marche: { backgroundColor: "rgba(134, 239, 172, 0.2)", color: "#166534", borderColor: "rgba(74, 222, 128, 0.28)" },
  musique: { backgroundColor: "rgba(192, 219, 254, 0.24)", color: "#1e3a8a", borderColor: "rgba(96, 165, 250, 0.28)" },
  theatre: { backgroundColor: "rgba(244, 114, 182, 0.18)", color: "#9d174d", borderColor: "rgba(236, 72, 153, 0.28)" },
  science: { backgroundColor: "rgba(110, 231, 245, 0.2)", color: "#0f766e", borderColor: "rgba(45, 212, 191, 0.28)" }
};

const { getEventImage, markImageError, formatDateRange, getEventExcerpt } = eventsStore;

const getCategoryName = (categoryId: string) => categoryNames.value.get(categoryId) ?? "";

const getCategoryTheme = (categoryId: string): CategoryTheme => {
  const normalized = categoryId.trim().toLowerCase();
  return categoryThemeMap[normalized] ?? {
    backgroundColor: "rgba(191, 219, 254, 0.24)",
    color: "#1e3a8a",
    borderColor: "rgba(96, 165, 250, 0.26)"
  };
};

const emitSelect = (id: string) => {
  emit("select", id);
};
</script>
