import path from "node:path";
import express from "express";
import { EventRepository } from "./events/repository";
import { getPublicEventPageStatus } from "./events/service";

// Top-level SPA routes that exist regardless of any dynamic data — kept in sync with
// frontend/src/router.ts. A path outside this list (and outside /event/:id) is a genuine
// unknown URL and must get a real 404, not a soft one.
const KNOWN_STATIC_ROUTES = new Set([
  "/",
  "/contact",
  "/mentions-legales"
]);

// Authentication and backoffice routes must never be indexed by search engines.
const NOINDEX_ROUTES = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

const isBackofficeRoute = (pathname: string) => pathname === "/backoffice" || pathname.startsWith("/backoffice/");

const EVENT_DETAIL_PATTERN = /^\/event\/([^/]+)$/;

const sendNoindexIndex = (res: express.Response, indexPath: string, status = 200) => {
  res.status(status).set("X-Robots-Tag", "noindex").sendFile(indexPath);
};

export const registerStatic = (app: express.Express, eventRepository: EventRepository) => {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  const indexPath = path.join(frontendDist, "index.html");

  app.use(express.static(frontendDist));

  app.get("*", (req, res) => {
    const pathname = req.path;

    if (pathname.startsWith("/api/") || pathname === "/api") {
      res.status(404).json({ message: "Route API introuvable." });
      return;
    }

    const eventMatch = pathname.match(EVENT_DETAIL_PATTERN);
    if (eventMatch) {
      void getPublicEventPageStatus(eventRepository, eventMatch[1]).then((status) => {
        res.status(status).sendFile(indexPath);
      });
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
      res.status(200).sendFile(indexPath);
      return;
    }

    res.status(404).sendFile(indexPath);
  });
};
