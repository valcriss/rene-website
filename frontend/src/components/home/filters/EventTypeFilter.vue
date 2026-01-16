<template>
  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Types d'événements</p>
    <div v-if="availableCategories.length === 0" class="mt-3 text-sm text-slate-500">
      Aucun type disponible.
    </div>
    <div v-else class="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
      <label
        v-for="category in availableCategories"
        :key="category.id"
        class="flex items-center gap-2 text-sm text-slate-600"
      >
        <input
          type="checkbox"
          :checked="modelValue.types.includes(category.id)"
          :data-testid="`filter-type-${category.id}`"
          @change="emitToggleType(category.id)"
        />
        {{ category.name }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventFilters } from "../../../events/filterEvents";
import type { Category } from "../../../api/categories";

defineOptions({
  name: "HomeEventTypeFilter"
});

type Props = {
  modelValue: EventFilters;
  availableCategories: Category[];
};

defineProps<Props>();

const emit = defineEmits<{
  (event: "toggle-type", type: string): void;
}>();

const emitToggleType = (type: string) => {
  emit("toggle-type", type);
};
</script>
