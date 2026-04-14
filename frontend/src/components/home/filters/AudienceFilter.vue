<template>
  <div class="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ $t("filters.audiences") }}</p>
    <div v-if="availableAudiences.length === 0" class="mt-3 text-sm text-slate-500">
      {{ $t("filters.noAudiences") }}
    </div>
    <div v-else class="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
      <label
        v-for="audience in availableAudiences"
        :key="audience.id"
        class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
      >
        <input
          type="checkbox"
          :checked="modelValue.audiences.includes(audience.id)"
          :data-testid="`filter-audience-${audience.id}`"
          @change="emitToggleAudience(audience.id)"
        />
        {{ audience.name }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Audience } from "../../../api/audiences";
import type { EventFilters } from "../../../events/filterEvents";

defineOptions({
  name: "HomeAudienceFilter"
});

type Props = {
  modelValue: EventFilters;
  availableAudiences: Audience[];
};

defineProps<Props>();

const emit = defineEmits<{
  (event: "toggle-audience", audience: string): void;
}>();

const emitToggleAudience = (audience: string) => {
  emit("toggle-audience", audience);
};
</script>