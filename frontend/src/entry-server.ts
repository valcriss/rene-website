import { renderToString } from "@vue/server-renderer";
import { createHead } from "@unhead/vue/server";
import type { VueHeadClient } from "@unhead/vue";
import { createApp } from "./appFactory";

export type RenderResult = {
  html: string;
  stateScript: string;
  head: VueHeadClient;
};

// `</script>` inside serialized state (e.g. an event description) would otherwise close the
// tag early; escaping `<` keeps the JSON valid while staying inert as HTML.
const serializeState = (state: unknown): string => JSON.stringify(state).replace(/</g, "\\u003c");

// Every frontend/src/api/*.ts call uses a root-relative URL (e.g. fetch("/api/public/events")),
// which browsers resolve against the current page origin. Node's fetch has no page origin to
// resolve against and throws "Failed to parse URL from /api/...", so the onServerPrefetch calls
// that populate this render's Pinia state (App.vue, HomePage.vue, AgendaLandingPage.vue,
// EventDetailView.vue, LegalNoticePage.vue) were silently failing in production: the server
// rendered empty/error markup, and the client then fetched successfully and hydrated with real
// data — a hydration mismatch on every page. This process also serves those same /api/* routes,
// so prefixing with our own loopback address lets every existing relative call resolve as-is,
// without touching each call site.
const INTERNAL_API_URL = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export const resolveServerFetchTarget = (input: FetchInput): FetchInput =>
  typeof input === "string" && input.startsWith("/") ? `${INTERNAL_API_URL}${input}` : input;

const browserFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: FetchInput, init?: FetchInit) => browserFetch(resolveServerFetchTarget(input), init);

export const render = async (url: string, siteUrl: string): Promise<RenderResult> => {
  const { app, router, pinia, head } = createApp(createHead, url, siteUrl);
  await router.push(url);
  await router.isReady();

  const html = await renderToString(app);
  const stateScript = `<script id="__PINIA_STATE__" type="application/json">${serializeState(pinia.state.value)}</script>`;

  return { html, stateScript, head };
};
