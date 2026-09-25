import path from "node:path";
import { readFileSync } from "node:fs";
import express from "express";
import { EventRepository } from "./events/repository";
import { getPublicEventPageStatus, getPublicEventPageStatusBySlug } from "./events/service";
import { getAgendaCategoryPageStatus, getAgendaCityPageStatus } from "./seo/agenda";
import { createSsrRenderer, SsrRenderer } from "./ssr";

// Top-level SPA routes that exist regardless of any dynamic data — kept in sync with
// frontend/src/router.ts. A path outside this list (and outside /evenements/:slug and the
// /agenda/* dynamic patterns below) is a genuine unknown URL and must get a real 404, not a soft
// one. /agenda/ce-week-end is always relevant (it's evergreen — see docs/seo-local-pages.md), so
// it's listed here rather than resolved dynamically like the city/category pages.
const KNOWN_STATIC_ROUTES = new Set([
  "/",
  "/contact",
  "/mentions-legales",
  "/agenda/ce-week-end"
]);

// Authentication and backoffice routes must never be indexed by search engines, and have no
// SEO value that would justify the cost/risk of server-rendering them.
const NOINDEX_ROUTES = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

const isBackofficeRoute = (pathname: string) => pathname === "/backoffice" || pathname.startsWith("/backoffice/");

// Legacy UUID-based detail URL, kept only to 301-redirect to the stable slug URL.
const EVENT_DETAIL_PATTERN = /^\/event\/([^/]+)$/;
// Canonical, human-readable detail URL (issue #50).
const EVENT_SLUG_PATTERN = /^\/evenements\/([^/]+)$/;
// Local SEO landing pages (issue #56) — see docs/seo-local-pages.md for the known-vs-active-vs-
// unknown status rules these patterns resolve against.
const AGENDA_CITY_PATTERN = /^\/agenda\/ville\/([^/]+)$/;
const AGENDA_CATEGORY_PATTERN = /^\/agenda\/categorie\/([^/]+)$/;

// Sent as-is for every route we don't server-render (backoffice, auth pages, and genuine
// 404s): the built file still carries the literal <!--ssr-outlet--> / <!--ssr-state-->
// placeholders, which only the SSR renderer's own template step ever substitutes. Left in
// place, `#app` isn't truly empty, so createSSRApp's mount() always attempts to hydrate
// against that comment node and logs a spurious "Hydration completed but contains mismatches."
// on every login/backoffice load, even though nothing is actually wrong — stripping them here
// leaves a genuinely empty container, so mount() does a plain client render instead.
const stripSsrPlaceholders = (html: string) => html.replace("<!--ssr-outlet-->", "").replace("<!--ssr-state-->", "");

const sendIndex = (res: express.Response, shellHtml: string, status: number) => {
  res.status(status).type("html").send(shellHtml);
};

const sendNoindexIndex = (res: express.Response, shellHtml: string, status: number) => {
  res.status(status).set("X-Robots-Tag", "noindex").type("html").send(shellHtml);
};

export const registerStatic = (app: express.Express, eventRepository: EventRepository) => {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist/client");

  // Read and stripped lazily, on the first request that actually needs it (like getRenderer()
  // below) rather than here — so registerStatic() itself never depends on the built file
  // existing, and a test that never issues an HTML request never pays for it either. Cached per
  // registerStatic() call (not module-level) so each Express app/test gets its own fresh read.
  let cachedShellHtml: string | null = null;
  const getShellHtml = (): string => {
    if (cachedShellHtml === null) {
      cachedShellHtml = stripSsrPlaceholders(readFileSync(path.join(frontendDist, "index.html"), "utf-8"));
    }
    return cachedShellHtml;
  };

  // `index: false` is essential: without it, express.static serves the raw index.html for "/"
  // (and any other directory-like path) before our own handler below can server-render it.
  //
  // Only files under /assets/ carry a content hash in their filename (Vite's build output) — a
  // change to their content always means a new URL, so they can be cached for a year as
  // immutable. Everything else served from this directory (index.html, logo.svg, mark.png) keeps
  // its URL across deploys, so it must always be revalidated instead.
  app.use(
    express.static(frontendDist, {
      index: false,
      setHeaders: (res, filePath) => {
        const cacheControl = filePath.includes(`${path.sep}assets${path.sep}`)
          ? "public, max-age=31536000, immutable"
          : "no-cache";
        res.setHeader("Cache-Control", cacheControl);
      }
    })
  );

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

  app.get("/{*splat}", (req, res) => {
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

        sendIndex(res, getShellHtml(), 404);
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

    const cityMatch = pathname.match(AGENDA_CITY_PATTERN);
    if (cityMatch) {
      void (async () => {
        const [{ status, isEmpty }, renderer] = await Promise.all([
          getAgendaCityPageStatus(eventRepository, cityMatch[1]),
          getRenderer()
        ]);
        if (status === 404) {
          sendIndex(res, getShellHtml(), 404);
          return;
        }
        const { html } = await renderer.render(req.originalUrl);
        const response = res.status(status).type("html");
        if (isEmpty) {
          response.set("X-Robots-Tag", "noindex");
        }
        response.send(html);
      })();
      return;
    }

    const categoryMatch = pathname.match(AGENDA_CATEGORY_PATTERN);
    if (categoryMatch) {
      void (async () => {
        const [{ status, isEmpty }, renderer] = await Promise.all([
          getAgendaCategoryPageStatus(eventRepository, categoryMatch[1]),
          getRenderer()
        ]);
        if (status === 404) {
          sendIndex(res, getShellHtml(), 404);
          return;
        }
        const { html } = await renderer.render(req.originalUrl);
        const response = res.status(status).type("html");
        if (isEmpty) {
          response.set("X-Robots-Tag", "noindex");
        }
        response.send(html);
      })();
      return;
    }

    if (isBackofficeRoute(pathname)) {
      sendNoindexIndex(res, getShellHtml(), 200);
      return;
    }

    if (NOINDEX_ROUTES.has(pathname)) {
      sendNoindexIndex(res, getShellHtml(), 200);
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

    sendIndex(res, getShellHtml(), 404);
  });
};
