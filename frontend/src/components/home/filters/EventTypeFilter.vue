<template>
  <div class="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ $t("filters.eventTypes") }}</p>
    <div v-if="availableCategories.length === 0" class="mt-3 text-sm text-slate-500">
      {{ $t("filters.noTypes") }}
    </div>
    <div v-else class="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
      <label
        v-for="category in availableCategories"
        :key="category.id"
        class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
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
