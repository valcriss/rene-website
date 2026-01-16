<template>
  <header class="border-b border-slate-200 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ tagline }}</p>
        <p class="text-lg font-semibold">{{ title }}</p>
      </div>
      <button
        v-if="showLogin"
        type="button"
        class="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        @click="emitLogin"
      >
        {{ loginLabel }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
type Props = {
  title?: string;
  tagline?: string;
  showLogin?: boolean;
  loginLabel?: string;
};

const props = withDefaults(defineProps<Props>(), {
  title: "Rene Website",
  tagline: "Agenda culturel",
  showLogin: true,
  loginLabel: "Me connecter"
});

const emit = defineEmits<{
  (event: "login"): void;
}>();

const emitLogin = () => {
  emit("login");
};
</script>
