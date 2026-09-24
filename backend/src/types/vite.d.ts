// Vite (a devDependency, never bundled into production) ships type declarations that need a
// modern `moduleResolution` setting (node16/nodenext/bundler) which this backend doesn't use
// project-wide. Rather than change that globally for one dev-only dynamic import, this ambient
// declaration covers only the small dev-server surface `backend/src/ssr.ts` actually calls.
declare module "vite" {
  import type { RequestHandler } from "express";

  export type ViteDevServer = {
    middlewares: RequestHandler;
    transformIndexHtml: (url: string, html: string) => Promise<string>;
    ssrLoadModule: (id: string) => Promise<Record<string, unknown>>;
  };

  export function createServer(options: {
    root: string;
    server: { middlewareMode: true };
    appType: "custom";
  }): Promise<ViteDevServer>;
}
