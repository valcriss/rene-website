<template>
  <svg
    class="animate-spin"
    :class="sizeClass"
    viewBox="0 0 24 24"
    fill="none"
    role="status"
    aria-hidden="true"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path
      class="opacity-90"
      fill="currentColor"
      d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ size?: "sm" | "md" }>(), {
  size: "md"
});

const sizeClass = computed(() => (props.size === "sm" ? "h-4 w-4" : "h-6 w-6"));
</script>
