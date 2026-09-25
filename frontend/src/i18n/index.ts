import { createI18n } from "vue-i18n";
import type { App } from "vue";
import { watch } from "vue";
import { messages } from "./messages";

export const DEFAULT_LOCALE = "fr";
export const SUPPORTED_LOCALES = ["fr", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "rene-website-locale";

const isSupportedLocale = (value: string): value is AppLocale =>
  SUPPORTED_LOCALES.includes(value as AppLocale);

const normalizeLocale = (value?: string | null): AppLocale | null => {
  if (!value) {
    return null;
  }

  const [language] = value.toLowerCase().split("-");
  return isSupportedLocale(language) ? language : null;
};

// Deliberately ignores navigator.language (issue #57): the public site is indexed in French
// only, with English treated as a non-indexable interface preference. A fresh visit — including
// a crawler's, which never carries our localStorage key — must render the same deterministic
// French version every time; only an explicit, previously saved choice from the language
// switcher may change that.
//
// That saved choice must NOT feed the initial `locale` below: the server never sees
// localStorage and always renders French, so if the client's very first render (the one
// hydration diffs against) already used a saved "en" preference, Vue logs "Hydration
// completed but contains mismatches." Instead this always resolves to French, matching SSR;
// entry-client.ts applies `getSavedLocale()` afterwards, once hydration has completed.
export const resolveInitialLocale = (): AppLocale => DEFAULT_LOCALE;

export const getSavedLocale = (): AppLocale | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
};

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages
});

export const getCurrentLocale = (): AppLocale => {
  const locale = normalizeLocale(i18n.global.locale.value);
  return locale ?? DEFAULT_LOCALE;
};

export const getCurrentLocaleTag = (): string => (getCurrentLocale() === "en" ? "en-US" : "fr-FR");

export const setLocale = (locale: AppLocale) => {
  i18n.global.locale.value = locale;
};

export const installI18n = (app: App) => {
  app.use(i18n);

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = getCurrentLocale();

  watch(
    () => i18n.global.locale.value,
    (nextLocale) => {
      const locale = normalizeLocale(nextLocale) ?? DEFAULT_LOCALE;
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    },
    { immediate: true }
  );
};
