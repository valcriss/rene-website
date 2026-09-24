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

export const render = async (url: string, siteUrl: string): Promise<RenderResult> => {
  const { app, router, pinia, head } = createApp(createHead, url, siteUrl);
  await router.push(url);
  await router.isReady();

  const html = await renderToString(app);
  const stateScript = `<script id="__PINIA_STATE__" type="application/json">${serializeState(pinia.state.value)}</script>`;

  return { html, stateScript, head };
};
