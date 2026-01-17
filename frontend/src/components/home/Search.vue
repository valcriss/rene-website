<template>
  <div class="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <label class="text-sm font-medium text-slate-700" for="home-search">
      Rechercher un événement
    </label>
    <div class="mt-3 flex flex-col gap-3 sm:flex-row">
      <input
        id="home-search"
        :value="modelValue"
        data-testid="home-search"
        type="text"
        placeholder="Titre, lieu, ville ou type"
        class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
        @input="onInput"
      />
      <button
        type="button"
        class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600"
        @click="emitReset"
      >
        Réinitialiser
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
