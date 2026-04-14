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

export const resolveInitialLocale = (): AppLocale => {
  if (typeof window !== "undefined") {
    const savedLocale = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
    if (savedLocale) {
      return savedLocale;
    }

    const browserLocale = normalizeLocale(window.navigator.language);
    if (browserLocale) {
      return browserLocale;
    }
  }

  return DEFAULT_LOCALE;
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
