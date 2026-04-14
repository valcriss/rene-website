<template>
  <div class="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ $t("filters.cities") }}</p>
    <div v-if="availableCities.length === 0" class="mt-3 text-sm text-slate-500">
      {{ $t("filters.noCities") }}
    </div>
    <div v-else class="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
      <label
        v-for="city in availableCities"
        :key="city"
        class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
      >
        <input
          type="checkbox"
          :checked="modelValue.cities.includes(city)"
          :data-testid="`filter-city-${city}`"
          @change="emitToggleCity(city)"
        />
        {{ city }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventFilters } from "../../../events/filterEvents";

defineOptions({
  name: "HomeCityFilter"
});

type Props = {
  modelValue: EventFilters;
  availableCities: string[];
};

defineProps<Props>();

const emit = defineEmits<{
  (event: "toggle-city", city: string): void;
}>();

const emitToggleCity = (city: string) => {
  emit("toggle-city", city);
};
</script>
