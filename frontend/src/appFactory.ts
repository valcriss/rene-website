import { createSSRApp } from "vue";
import type { App } from "vue";
import { createPinia } from "pinia";
import type { Pinia } from "pinia";
import { createMemoryHistory, createWebHistory } from "vue-router";
import type { Router } from "vue-router";
import type { VueHeadClient } from "@unhead/vue";
import AppRoot from "./App.vue";
import { createAppRouter } from "./router";
import { installI18n } from "./i18n";
import { SITE_URL_KEY } from "./composables/useSiteUrl";

export type CreatedApp = {
  app: App;
  router: Router;
  pinia: Pinia;
  head: VueHeadClient;
};

// `createSSRApp` (not `createApp`) is used on both sides: on the server it renders exactly
// like a normal app, and on the client it hydrates over server-rendered markup when present,
// or falls back to a plain mount when the container is empty (routes we don't SSR).
//
// `createHeadFactory` is injected rather than imported directly because unhead ships separate
// client/server entry points with different defaults (DOM reconciliation vs. SSR string
// rendering); the caller (entry-client.ts / entry-server.ts) picks the right one.
export const createApp = (
  createHeadFactory: () => VueHeadClient,
  url?: string,
  siteUrl?: string
): CreatedApp => {
  const app = createSSRApp(AppRoot);

  const pinia = createPinia();
  app.use(pinia);

  const router = createAppRouter(url !== undefined ? createMemoryHistory() : createWebHistory());
  app.use(router);

  installI18n(app);

  const head = createHeadFactory();
  app.use(head);

  if (siteUrl) {
    app.provide(SITE_URL_KEY, siteUrl);
  }

  return { app, router, pinia, head };
};
