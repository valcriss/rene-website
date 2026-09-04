<template>
  <div class="max-w-3xl">
    <p class="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700/65">{{ $t("navigation.tagline") }}</p>
    <h1 class="mt-4">
      <img class="h-auto w-40 sm:w-52" src="/logo.svg" :alt="$t('navigation.title')" />
    </h1>
    <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
      {{ titleLead }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "HomeTitle" });

defineProps<{ titleLead: string }>();
</script>
