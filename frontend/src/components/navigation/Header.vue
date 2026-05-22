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
        <div v-if="resolvedShowAuth" ref="accountMenuRef" class="relative">
          <button
            v-if="!isAuthenticated"
            type="button"
            class="rounded-full bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-slate-900/20 transition hover:brightness-105"
            @click="handleLoginClick"
          >
            {{ resolvedLoginLabel }}
          </button>
          <div v-else>
            <button
              type="button"
              class="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/70"
              :aria-expanded="menuOpen ? 'true' : 'false'"
              :aria-label="t('common.account')"
              @click="toggleAccountMenu"
            >
              <span class="flex flex-col leading-tight">
                <span class="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">{{ roleLabel }}</span>
                <span class="font-medium text-slate-900">{{ accountLabel }}</span>
              </span>
              <span class="text-slate-400">{{ menuOpen ? '▴' : '▾' }}</span>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-64 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]"
            >
              <div class="rounded-[1.1rem] border border-sky-100 bg-sky-50/80 px-4 py-3">
                <p class="text-[11px] uppercase tracking-[0.22em] text-slate-500">{{ t('common.account') }}</p>
                <p class="mt-2 text-sm font-semibold text-slate-900">{{ accountLabel }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ roleLabel }}</p>
              </div>

              <div class="mt-3 grid gap-2">
                <button
                  v-if="!isBackofficeRoute"
                  type="button"
                  class="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                  @click="goToBackoffice"
                >
                  {{ t('common.mySpace') }}
                </button>
                <button
                  type="button"
                  class="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                  @click="handleLogout"
                >
                  {{ t('common.logout') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { setLocale as updateLocale, type AppLocale } from "../../i18n";

defineOptions({ name: "NavigationHeader" });

type Props = {
  title?: string;
  tagline?: string;
  showAuth?: boolean;
  showLogin?: boolean;
  loginLabel?: string;
  isAuthenticated?: boolean;
  accountLabel?: string;
  roleLabel?: string;
  isBackofficeRoute?: boolean;
};

const props = defineProps<Props>();
const instance = getCurrentInstance();
let router: ReturnType<typeof useRouter> | null = null;
let route: ReturnType<typeof useRoute> | { path: string; fullPath: string } | undefined = { path: "", fullPath: "" };

try {
  router = useRouter() ?? null;
  route = useRoute() ?? { path: "", fullPath: "" };
} catch {
  router = null;
  route = { path: "", fullPath: "" };
}

const { t, locale } = useI18n();
const menuOpen = ref(false);
const accountMenuRef = ref<HTMLElement | null>(null);

const locales = computed<{ value: AppLocale; label: string }[]>(() => [
  { value: "fr", label: t("common.french") },
  { value: "en", label: t("common.english") }
]);

const resolvedTitle = computed(() => props.title || t("navigation.title"));
const resolvedTagline = computed(() => props.tagline || t("navigation.tagline"));
const resolvedLoginLabel = computed(() => props.loginLabel || t("common.login"));
const resolvedShowAuth = computed(() => {
  const rawProps = instance?.vnode.props ?? {};

  if ("showAuth" in rawProps || "show-auth" in rawProps) {
    return props.showAuth;
  }

  if ("showLogin" in rawProps || "show-login" in rawProps) {
    return props.showLogin;
  }

  return true;
});
const isAuthenticated = computed(() => props.isAuthenticated ?? false);
const roleLabel = computed(() => props.roleLabel || t("backoffice.roleLabels.VISITOR"));
const accountLabel = computed(() => props.accountLabel || t("common.mySpace"));
const isBackofficeRoute = computed(() => props.isBackofficeRoute ?? route.path.startsWith("/backoffice"));

const emit = defineEmits<{
  (event: "login"): void;
  (event: "logout"): void;
}>();

const closeMenu = () => {
  menuOpen.value = false;
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!accountMenuRef.value) {
    return;
  }

  const target = event.target;
  if (target instanceof Node && !accountMenuRef.value.contains(target)) {
    closeMenu();
  }
};

const setLocale = (nextLocale: AppLocale) => {
  updateLocale(nextLocale);
};

const handleLoginClick = () => {
  emit("login");
  router?.push("/login");
};

const toggleAccountMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const goToBackoffice = () => {
  closeMenu();
  router?.push("/backoffice");
};

const handleLogout = () => {
  closeMenu();
  emit("logout");
  router?.push("/login");
};

watch(
  () => route.fullPath,
  () => {
    closeMenu();
  }
);

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>
