import path from "node:path";
import { promises as fs } from "node:fs";
import type { RequestHandler } from "express";

export type SsrRenderResult = {
  html: string;
};

export type SsrRenderer = {
  render: (url: string) => Promise<SsrRenderResult>;
  // Only set in dev mode: Vite's own asset/HMR middlewares, mounted ahead of our routes.
  devMiddlewares?: RequestHandler;
};

type EntryServerModule = {
  render: (url: string) => Promise<{ html: string; stateScript: string }>;
};

const CLIENT_DIST = path.resolve(__dirname, "../../frontend/dist/client");
const SERVER_DIST = path.resolve(__dirname, "../../frontend/dist/server");
const FRONTEND_ROOT = path.resolve(__dirname, "../../frontend");

const applyTemplate = (template: string, appHtml: string, stateScript: string): string =>
  template.replace("<!--ssr-outlet-->", appHtml).replace("<!--ssr-state-->", stateScript);

const createProductionRenderer = async (): Promise<SsrRenderer> => {
  const template = await fs.readFile(path.join(CLIENT_DIST, "index.html"), "utf-8");
  const entryPath = path.join(SERVER_DIST, "entry-server.js");
  const { render } = (await import(entryPath)) as EntryServerModule;

  return {
    render: async (url: string) => {
      const { html, stateScript } = await render(url);
      return { html: applyTemplate(template, html, stateScript) };
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
      const { html, stateScript } = await render(url);
      return { html: applyTemplate(template, html, stateScript) };
    }
  };
};

export const createSsrRenderer = (): Promise<SsrRenderer> =>
  process.env.NODE_ENV === "production" ? createProductionRenderer() : createDevRenderer();
