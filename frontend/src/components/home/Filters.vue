<template>
  <aside>
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 lg:hidden"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-controls="home-filters-panel"
      @click="isOpen = !isOpen"
    >
      <span>{{ isOpen ? $t("filters.hideFilters") : $t("filters.showFilters") }}</span>
      <span class="text-slate-400">{{ isOpen ? "▴" : "▾" }}</span>
    </button>

    <div id="home-filters-panel" class="mt-4 gap-4 lg:mt-0 lg:grid lg:grid-cols-4" :class="isOpen ? 'grid' : 'hidden'">
      <HomeDateFilter
        :model-value="modelValue"
        @update:model-value="updateFilters"
        @date-range-change="emitDateRangeChange"
        @apply-preset="emitApplyPreset"
      />

      <HomeCityFilter
        :model-value="modelValue"
        :available-cities="availableCities"
        @toggle-city="emitToggleCity"
      />

      <HomeEventTypeFilter
        :model-value="modelValue"
        :available-categories="availableCategories"
        @toggle-type="emitToggleType"
      />

      <HomeAudienceFilter
        :model-value="modelValue"
        :available-audiences="availableAudiences"
        @toggle-audience="emitToggleAudience"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { EventFilters } from "../../events/filterEvents";
import type { Audience } from "../../api/audiences";
import type { Category } from "../../api/categories";
import HomeAudienceFilter from "./filters/AudienceFilter.vue";
import HomeCityFilter from "./filters/CityFilter.vue";
import HomeDateFilter from "./filters/DateFilter.vue";
import HomeEventTypeFilter from "./filters/EventTypeFilter.vue";

defineOptions({
  name: "HomeFilters"
});

const isOpen = ref(false);

type Props = {
  modelValue: EventFilters;
  availableCities: string[];
  availableCategories: Category[];
  availableAudiences: Audience[];
};

defineProps<Props>();

const emit = defineEmits<{
  (event: "update:modelValue", value: EventFilters): void;
  (event: "date-range-change"): void;
  (event: "apply-preset"): void;
  (event: "toggle-city", city: string): void;
  (event: "toggle-type", type: string): void;
  (event: "toggle-audience", audience: string): void;
}>();

const updateFilters = (next: EventFilters) => {
  emit("update:modelValue", next);
};

const emitDateRangeChange = () => {
  emit("date-range-change");
};

const emitApplyPreset = () => {
  emit("apply-preset");
};

const emitToggleCity = (city: string) => {
  emit("toggle-city", city);
};

const emitToggleType = (type: string) => {
  emit("toggle-type", type);
};

const emitToggleAudience = (audience: string) => {
  emit("toggle-audience", audience);
};
</script>
