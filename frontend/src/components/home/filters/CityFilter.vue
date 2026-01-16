<template>
  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Villes</p>
    <div v-if="availableCities.length === 0" class="mt-3 text-sm text-slate-500">
      Aucune ville disponible.
    </div>
    <div v-else class="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
      <label
        v-for="city in availableCities"
        :key="city"
        class="flex items-center gap-2 text-sm text-slate-600"
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
