import path from "node:path";
import { promises as fs } from "node:fs";
import type { RequestHandler } from "express";
import type { transformHtmlTemplate } from "unhead/server";

export type SsrRenderResult = {
  html: string;
};

export type SsrRenderer = {
  render: (url: string) => Promise<SsrRenderResult>;
  // Only set in dev mode: Vite's own asset/HMR middlewares, mounted ahead of our routes.
  devMiddlewares?: RequestHandler;
};

type EntryServerModule = {
  render: (url: string, siteUrl: string) => Promise<{ html: string; stateScript: string; head: Parameters<typeof transformHtmlTemplate>[0] }>;
};

const CLIENT_DIST = path.resolve(__dirname, "../../frontend/dist/client");
const SERVER_DIST = path.resolve(__dirname, "../../frontend/dist/server");
const FRONTEND_ROOT = path.resolve(__dirname, "../../frontend");

// Falls back to a same-host default in dev, where SITE_URL isn't required; production always
// validates SITE_URL at startup (backend/src/config/environment.ts), so it's always set there.
const resolveSiteUrl = (): string => process.env.SITE_URL?.trim() || `http://localhost:${process.env.PORT ?? "3000"}`;

// `unhead/server` ships ESM-only, and this module is loaded transitively by almost every
// backend test (via app.ts -> static.ts -> ssr.ts) that never touches SSR rendering itself;
// a static import would force every one of those tests to load real ESM. Deferring it to a
// dynamic import (like "vite" below) means it's only ever loaded when actually rendering.
const applyTemplate = async (
  template: string,
  appHtml: string,
  stateScript: string,
  head: Parameters<typeof transformHtmlTemplate>[0]
): Promise<string> => {
  const { transformHtmlTemplate } = await import("unhead/server");
  const withAppAndState = template.replace("<!--ssr-outlet-->", appHtml).replace("<!--ssr-state-->", stateScript);
  return transformHtmlTemplate(head, withAppAndState);
};

const createProductionRenderer = async (): Promise<SsrRenderer> => {
  const template = await fs.readFile(path.join(CLIENT_DIST, "index.html"), "utf-8");
  const entryPath = path.join(SERVER_DIST, "entry-server.js");
  const { render } = (await import(entryPath)) as EntryServerModule;

  return {
    render: async (url: string) => {
      const { html, stateScript, head } = await render(url, resolveSiteUrl());
      return { html: await applyTemplate(template, html, stateScript, head) };
    }
  };
};

// Dev-only: Vite is a devDependency and must never be required from a production code path.
const createDevRenderer = async (): Promise<SsrRenderer> => {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom"
  });

  return {
    devMiddlewares: vite.middlewares,
    render: async (url: string) => {
      const rawTemplate = await fs.readFile(path.join(FRONTEND_ROOT, "index.html"), "utf-8");
      const template = await vite.transformIndexHtml(url, rawTemplate);
      const { render } = (await vite.ssrLoadModule("/src/entry-server.ts")) as unknown as EntryServerModule;
      const { html, stateScript, head } = await render(url, resolveSiteUrl());
      return { html: await applyTemplate(template, html, stateScript, head) };
    }
  };
};

export const createSsrRenderer = (): Promise<SsrRenderer> =>
  process.env.NODE_ENV === "production" ? createProductionRenderer() : createDevRenderer();
