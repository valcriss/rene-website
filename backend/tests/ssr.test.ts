import path from "node:path";
import { promises as fs } from "node:fs";

const createServerMock = jest.fn();

jest.mock("vite", () => ({
  createServer: (...args: unknown[]) => createServerMock(...args)
}));

import { createSsrRenderer } from "../src/ssr";

const clientDist = path.resolve(__dirname, "../../frontend/dist/client");
const serverDist = path.resolve(__dirname, "../../frontend/dist/server");
const frontendRoot = path.resolve(__dirname, "../../frontend");
const indexHtmlAtRoot = path.join(frontendRoot, "index.html");

describe("createSsrRenderer", () => {
  const originalEnv = process.env.NODE_ENV;
  let hadRootIndexHtml = false;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    createServerMock.mockReset();
  });

  describe("production", () => {
    beforeAll(async () => {
      await fs.mkdir(clientDist, { recursive: true });
      await fs.mkdir(serverDist, { recursive: true });
      await fs.writeFile(
        path.join(clientDist, "index.html"),
        '<!doctype html><html><head><title>R3ne</title></head><body><div id="app"><!--ssr-outlet--></div><!--ssr-state--></body></html>'
      );
      await fs.writeFile(
        path.join(serverDist, "entry-server.js"),
        [
          "module.exports.render = async (url) => ({",
          "  html: `<main data-url=\"${url}\">rendered</main>`,",
          '  stateScript: \'<script id="__PINIA_STATE__">{}</script>\'',
          "});"
        ].join("\n")
      );
    });

    afterAll(async () => {
      await fs.rm(clientDist, { recursive: true, force: true });
      await fs.rm(serverDist, { recursive: true, force: true });
    });

    it("reads the built client template and injects the SSR output and state script", async () => {
      process.env.NODE_ENV = "production";

      const renderer = await createSsrRenderer();
      const { html } = await renderer.render("/event/1");

      expect(html).toContain('<main data-url="/event/1">rendered</main>');
      expect(html).toContain('<script id="__PINIA_STATE__">{}</script>');
      expect(html).not.toContain("<!--ssr-outlet-->");
      expect(html).not.toContain("<!--ssr-state-->");
      expect(renderer.devMiddlewares).toBeUndefined();
      expect(createServerMock).not.toHaveBeenCalled();
    });
  });

  describe("development", () => {
    beforeAll(async () => {
      try {
        await fs.access(indexHtmlAtRoot);
        hadRootIndexHtml = true;
      } catch {
        hadRootIndexHtml = false;
      }
    });

    it("creates a Vite dev server in middleware mode and renders through ssrLoadModule", async () => {
      process.env.NODE_ENV = "development";
      const devMiddlewares = jest.fn();
      const ssrLoadModuleMock = jest.fn().mockResolvedValue({
        render: async (url: string) => ({
          html: `<main data-url="${url}">dev rendered</main>`,
          stateScript: "<script>dev-state</script>"
        })
      });
      const transformIndexHtmlMock = jest.fn().mockImplementation((_url: string, template: string) =>
        Promise.resolve(template.replace("<title>R3ne</title>", "<title>R3ne (dev)</title>"))
      );
      createServerMock.mockResolvedValue({
        middlewares: devMiddlewares,
        ssrLoadModule: ssrLoadModuleMock,
        transformIndexHtml: transformIndexHtmlMock
      });

      const renderer = await createSsrRenderer();

      expect(createServerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          root: frontendRoot,
          server: { middlewareMode: true },
          appType: "custom"
        })
      );
      expect(renderer.devMiddlewares).toBe(devMiddlewares);

      const { html } = await renderer.render("/");

      expect(ssrLoadModuleMock).toHaveBeenCalledWith("/src/entry-server.ts");
      expect(transformIndexHtmlMock).toHaveBeenCalled();
      expect(html).toContain('<main data-url="/">dev rendered</main>');
      expect(html).toContain("<title>R3ne (dev)</title>");
      expect(html).toContain("<script>dev-state</script>");
      expect(hadRootIndexHtml).toBe(true);
    });
  });
});
