import { inject, type InjectionKey } from "vue";

export const SITE_URL_KEY: InjectionKey<string> = Symbol("siteUrl");

// The public, absolute base URL of the site (e.g. "https://rene.example.org"), used to build
// canonical links and absolute Open Graph/Twitter Card URLs. On the server it's provided
// explicitly (from the SITE_URL env var); on the client, window.location.origin is always
// correct and needs no provider.
export const useSiteUrl = (): string => {
  const provided = inject(SITE_URL_KEY, "");
  if (provided) {
    return provided;
  }
  return typeof window !== "undefined" ? window.location.origin : "";
};
