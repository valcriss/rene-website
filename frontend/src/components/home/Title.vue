<template>
  <div class="max-w-3xl">
    <p class="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700/65">{{ $t("navigation.tagline") }}</p>
    <h1 class="font-display mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
      {{ $t("navigation.title") }}
    </h1>
    <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
      {{ $t("home.titleLead") }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "HomeTitle" });
</script>
