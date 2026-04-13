<template>
  <header class="border-b border-sky-100 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 xl:px-10">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-sky-700/60">{{ tagline }}</p>
        <p class="text-lg font-semibold text-slate-950">{{ title }}</p>
      </div>
      <button
        v-if="showLogin"
        type="button"
        class="rounded-full bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-slate-900/20 transition hover:brightness-105"
        @click="emitLogin"
      >
        {{ loginLabel }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineOptions({ name: "NavigationHeader" });

type Props = {
  title?: string;
  tagline?: string;
  showLogin?: boolean;
  loginLabel?: string;
};

withDefaults(defineProps<Props>(), {
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
