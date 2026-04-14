<template>
  <header class="border-b border-sky-100 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 xl:px-10">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-sky-700/60">{{ resolvedTagline }}</p>
        <p class="text-lg font-semibold text-slate-950">{{ resolvedTitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
          <span class="sr-only">{{ t("common.language") }}</span>
          <button
            v-for="localeOption in locales"
            :key="localeOption.value"
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
            :class="
              locale === localeOption.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            "
            @click="setLocale(localeOption.value)"
          >
            {{ localeOption.label }}
          </button>
        </div>
        <button
          v-if="showLogin"
          type="button"
          class="rounded-full bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-slate-900/20 transition hover:brightness-105"
          @click="emitLogin"
        >
          {{ resolvedLoginLabel }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { setLocale as updateLocale, type AppLocale } from "../../i18n";

defineOptions({ name: "NavigationHeader" });

type Props = {
  title?: string;
  tagline?: string;
  showLogin?: boolean;
  loginLabel?: string;
};

const props = withDefaults(defineProps<Props>(), {
  title: "",
  tagline: "",
  showLogin: true,
  loginLabel: ""
});
const { t, locale } = useI18n();

const locales = computed<{ value: AppLocale; label: string }[]>(() => [
  { value: "fr", label: t("common.french") },
  { value: "en", label: t("common.english") }
]);

const resolvedTitle = computed(() => props.title || t("navigation.title"));
const resolvedTagline = computed(() => props.tagline || t("navigation.tagline"));
const resolvedLoginLabel = computed(() => props.loginLabel || t("common.login"));

const emit = defineEmits<{
  (event: "login"): void;
}>();

const setLocale = (nextLocale: AppLocale) => {
  updateLocale(nextLocale);
};

const emitLogin = () => {
  emit("login");
};
</script>
