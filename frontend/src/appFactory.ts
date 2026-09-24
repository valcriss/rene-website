import { createSSRApp } from "vue";
import type { App } from "vue";
import { createPinia } from "pinia";
import type { Pinia } from "pinia";
import { createMemoryHistory, createWebHistory } from "vue-router";
import type { Router } from "vue-router";
import AppRoot from "./App.vue";
import { createAppRouter } from "./router";
import { installI18n } from "./i18n";

export type CreatedApp = {
  app: App;
  router: Router;
  pinia: Pinia;
};

// `createSSRApp` (not `createApp`) is used on both sides: on the server it renders exactly
// like a normal app, and on the client it hydrates over server-rendered markup when present,
// or falls back to a plain mount when the container is empty (routes we don't SSR).
export const createApp = (url?: string): CreatedApp => {
  const app = createSSRApp(AppRoot);

  const pinia = createPinia();
  app.use(pinia);

  const router = createAppRouter(url !== undefined ? createMemoryHistory() : createWebHistory());
  app.use(router);

  installI18n(app);

  return { app, router, pinia };
};
