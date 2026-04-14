<template>
  <div class="rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50/85 to-white p-5 shadow-sm sm:p-6">
    <label class="text-sm font-semibold text-slate-800" for="home-search">
      {{ $t("search.label") }}
    </label>
    <div class="mt-3 flex flex-col gap-3 sm:flex-row">
      <input
        id="home-search"
        :value="modelValue"
        data-testid="home-search"
        type="text"
        :placeholder="$t('search.placeholder')"
        class="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3.5 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
        @input="onInput"
      />
      <button
        type="button"
        class="rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-sm font-medium text-sky-900 shadow-sm transition hover:bg-sky-50"
        @click="emitReset"
      >
        {{ $t("search.reset") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "HomeSearch" });

type Props = {
  modelValue: string;
};

defineProps<Props>();

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "reset"): void;
}>();

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:modelValue", target?.value ?? "");
};

const emitReset = () => {
  emit("reset");
};
</script>
