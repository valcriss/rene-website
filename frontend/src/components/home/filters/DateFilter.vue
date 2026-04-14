<template>
  <div class="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ $t("filters.dates") }}</p>
    <div class="mt-3 grid gap-3">
      <label class="text-sm font-medium text-slate-600">
        {{ $t("filters.from") }}
        <input
          :value="modelValue.dateRange.start"
          type="date"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          @input="onStartChange"
        />
      </label>
      <label class="text-sm font-medium text-slate-600">
        {{ $t("filters.to") }}
        <input
          :value="modelValue.dateRange.end"
          type="date"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          @input="onEndChange"
        />
      </label>
    </div>
    <label class="mt-4 block text-sm font-medium text-slate-600">
      {{ $t("filters.preset") }}
      <select
        :value="modelValue.preset"
        class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
        @change="onPresetChange"
      >
        <option value="">{{ $t("filters.custom") }}</option>
        <option value="weekend">{{ $t("filters.weekend") }}</option>
        <option value="week">{{ $t("filters.week") }}</option>
        <option value="month">{{ $t("filters.month") }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { EventFilters } from "../../../events/filterEvents";

defineOptions({
  name: "HomeDateFilter"
});

type Props = {
  modelValue: EventFilters;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: "update:modelValue", value: EventFilters): void;
  (event: "date-range-change"): void;
  (event: "apply-preset"): void;
}>();

const updateFilters = (next: EventFilters) => {
  emit("update:modelValue", next);
};

const onStartChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  updateFilters({
    ...props.modelValue,
    dateRange: {
      ...props.modelValue.dateRange,
      start: target?.value ?? ""
    }
  });
  emit("date-range-change");
};

const onEndChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  updateFilters({
    ...props.modelValue,
    dateRange: {
      ...props.modelValue.dateRange,
      end: target?.value ?? ""
    }
  });
  emit("date-range-change");
};

const onPresetChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  updateFilters({
    ...props.modelValue,
    preset: target?.value ?? ""
  });
  emit("apply-preset");
};
</script>
