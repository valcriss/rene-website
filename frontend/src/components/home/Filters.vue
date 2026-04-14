<template>
  <aside class="grid gap-4 lg:grid-cols-4">
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
  </aside>
</template>

<script setup lang="ts">
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
