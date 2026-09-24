import path from "node:path";
import express from "express";
import { EventRepository } from "./events/repository";
import { getPublicEventPageStatus, getPublicEventPageStatusBySlug } from "./events/service";
import { createSsrRenderer, SsrRenderer } from "./ssr";

// Top-level SPA routes that exist regardless of any dynamic data — kept in sync with
// frontend/src/router.ts. A path outside this list (and outside /evenements/:slug) is a genuine
// unknown URL and must get a real 404, not a soft one.
const KNOWN_STATIC_ROUTES = new Set([
  "/",
  "/contact",
  "/mentions-legales"
]);

// Authentication and backoffice routes must never be indexed by search engines, and have no
// SEO value that would justify the cost/risk of server-rendering them.
const NOINDEX_ROUTES = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

const isBackofficeRoute = (pathname: string) => pathname === "/backoffice" || pathname.startsWith("/backoffice/");

// Legacy UUID-based detail URL, kept only to 301-redirect to the stable slug URL.
const EVENT_DETAIL_PATTERN = /^\/event\/([^/]+)$/;
// Canonical, human-readable detail URL (issue #50).
const EVENT_SLUG_PATTERN = /^\/evenements\/([^/]+)$/;

const sendNoindexIndex = (res: express.Response, indexPath: string, status = 200) => {
  res.status(status).set("X-Robots-Tag", "noindex").sendFile(indexPath);
};

export const registerStatic = (app: express.Express, eventRepository: EventRepository) => {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist/client");
  const indexPath = path.join(frontendDist, "index.html");

  // `index: false` is essential: without it, express.static serves the raw index.html for "/"
  // (and any other directory-like path) before our own handler below can server-render it.
  app.use(express.static(frontendDist, { index: false }));

  // Created lazily (not at registerStatic time) so tests that never issue an HTML request
  // never pay for it, and so the one dev-mode Vite server is shared across requests.
  let rendererPromise: Promise<SsrRenderer> | null = null;
  const getRenderer = () => {
    if (!rendererPromise) {
      rendererPromise = createSsrRenderer();
    }
    return rendererPromise;
  };

  app.use(async (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      next();
      return;
    }
    const renderer = await getRenderer();
    if (renderer.devMiddlewares) {
      renderer.devMiddlewares(req, res, next);
      return;
    }
    next();
  });

  app.get("*", (req, res) => {
    const pathname = req.path;

    if (pathname.startsWith("/api/") || pathname === "/api") {
      res.status(404).json({ message: "Route API introuvable." });
      return;
    }

    const slugMatch = pathname.match(EVENT_SLUG_PATTERN);
    if (slugMatch) {
      void (async () => {
        const slug = slugMatch[1];
        const status = await getPublicEventPageStatusBySlug(eventRepository, slug);
        if (status !== 404) {
          const renderer = await getRenderer();
          const { html } = await renderer.render(req.originalUrl);
          res.status(status).type("html").send(html);
          return;
        }

        const currentSlug = await eventRepository.resolveSlugRedirect(slug);
        if (currentSlug) {
          res.redirect(301, `/evenements/${currentSlug}`);
          return;
        }

        res.status(404).sendFile(indexPath);
      })();
      return;
    }

    const eventMatch = pathname.match(EVENT_DETAIL_PATTERN);
    if (eventMatch) {
      void (async () => {
        const event = await eventRepository.getById(eventMatch[1]);
        if (event?.slug) {
          res.redirect(301, `/evenements/${event.slug}`);
          return;
        }

        const [status, renderer] = await Promise.all([
          getPublicEventPageStatus(eventRepository, eventMatch[1]),
          getRenderer()
        ]);
        const { html } = await renderer.render(req.originalUrl);
        res.status(status).type("html").send(html);
      })();
      return;
    }

    if (isBackofficeRoute(pathname)) {
      sendNoindexIndex(res, indexPath);
      return;
    }

    if (NOINDEX_ROUTES.has(pathname)) {
      sendNoindexIndex(res, indexPath);
      return;
    }

    if (KNOWN_STATIC_ROUTES.has(pathname)) {
      void (async () => {
        const renderer = await getRenderer();
        const { html } = await renderer.render(req.originalUrl);
        res.status(200).type("html").send(html);
      })();
      return;
    }

    res.status(404).sendFile(indexPath);
  });
};
