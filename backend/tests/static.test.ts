import path from "node:path";
import { promises as fs } from "node:fs";
import express from "express";
import request from "supertest";
import { registerStatic } from "../src/static";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";
import { createSsrRenderer } from "../src/ssr";

const renderMock = jest.fn(async (url: string) => ({ html: `<html><body>SSR:${url}</body></html>` }));

jest.mock("../src/ssr", () => ({
  createSsrRenderer: jest.fn(async () => ({ render: renderMock }))
}));

const frontendDist = path.resolve(__dirname, "../../frontend/dist/client");

const baseEvent: Event = {
  id: "published",
  title: "Concert",
  content: "Soirée",
  image: "img",
  createdByUserId: null,
  categoryId: "music",
  audienceId: "all",
  occurrences: [],
  organizerName: "Association",
  slug: null,
  featured: false,
  status: "PUBLISHED",
  publishedAt: "2026-01-01T00:00:00.000Z",
  publicationEndAt: "2026-01-15T23:59:59.999Z",
  rejectionReason: null,
  archivedAt: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const createRepo = (event: Event | null, redirectSlug: string | null = null): EventRepository => ({
  list: async () => (event ? [event] : []),
  getById: async () => event,
  findBySlug: async (slug) => (event?.slug === slug ? event : null),
  resolveSlugRedirect: async () => redirectSlug,
  setSlug: async () => event,
  create: async () => event ?? baseEvent,
  update: async () => event,
  upsertPendingRevision: async () => event,
  submitPendingRevision: async () => event,
  rejectPendingRevision: async () => event,
  publishPendingRevision: async () => event,
  updateFeatured: async () => event,
  archiveEvent: async () => event,
  unarchiveEvent: async () => event,
  delete: async () => Boolean(event),
  updateStatus: async () => event
});

describe("registerStatic", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    await fs.mkdir(path.join(frontendDist, "assets"), { recursive: true });
    await fs.writeFile(path.join(frontendDist, "index.html"), "<h1>Index</h1>");
    await fs.writeFile(path.join(frontendDist, "hello.txt"), "hello");
    await fs.writeFile(path.join(frontendDist, "assets", "index-abc123.js"), "console.log('hi')");
  });

  afterAll(async () => {
    await fs.rm(frontendDist, { recursive: true, force: true });
  });

  beforeEach(() => {
    renderMock.mockClear();
    (createSsrRenderer as jest.Mock).mockClear();
    process.env.NODE_ENV = originalEnv;
  });

  it("serves static assets", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/hello.txt");

    expect(response.status).toBe(200);
    expect(response.text).toBe("hello");
  });

  it("caches non-hashed static files with no-cache, forcing revalidation", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/hello.txt");

    expect(response.headers["cache-control"]).toBe("no-cache");
  });

  it("caches hashed build assets for a year as immutable", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/assets/index-abc123.js");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("returns a JSON 404 for an unmatched API route", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Route API introuvable." });
  });

  it("returns a JSON 404 for exactly /api with no sub-path", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/api");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Route API introuvable." });
  });

  it("returns 200 with SSR-rendered HTML for a published, non-archived event page", async () => {
    const app = express();
    registerStatic(app, createRepo(baseEvent));

    const response = await request(app).get("/event/published");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<html><body>SSR:/event/published</body></html>");
    expect(renderMock).toHaveBeenCalledWith("/event/published");
  });

  it("returns 410 with SSR-rendered HTML for an event that was intentionally archived", async () => {
    const app = express();
    registerStatic(app, createRepo({ ...baseEvent, archivedAt: "2026-02-01T00:00:00.000Z" }));

    const response = await request(app).get("/event/published");

    expect(response.status).toBe(410);
    expect(response.text).toBe("<html><body>SSR:/event/published</body></html>");
  });

  it("returns 404 with SSR-rendered HTML for an unknown or never-published event id", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/event/missing");

    expect(response.status).toBe(404);
    expect(response.text).toBe("<html><body>SSR:/event/missing</body></html>");
  });

  it("301-redirects the legacy /event/:id URL to the canonical slug URL once the event has a slug", async () => {
    const app = express();
    registerStatic(app, createRepo({ ...baseEvent, slug: "concert-descartes-2026" }));

    const response = await request(app).get("/event/published");

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe("/evenements/concert-descartes-2026");
  });

  it("returns 200 with SSR-rendered HTML for the canonical slug URL of a published event", async () => {
    const app = express();
    registerStatic(app, createRepo({ ...baseEvent, slug: "concert-descartes-2026" }));

    const response = await request(app).get("/evenements/concert-descartes-2026");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<html><body>SSR:/evenements/concert-descartes-2026</body></html>");
  });

  it("returns 410 with SSR-rendered HTML for the canonical slug URL of an archived event", async () => {
    const app = express();
    registerStatic(
      app,
      createRepo({ ...baseEvent, slug: "concert-descartes-2026", archivedAt: "2026-02-01T00:00:00.000Z" })
    );

    const response = await request(app).get("/evenements/concert-descartes-2026");

    expect(response.status).toBe(410);
  });

  it("301-redirects a stale slug URL to the event's current slug", async () => {
    const app = express();
    registerStatic(app, createRepo(null, "concert-descartes-2026"));

    const response = await request(app).get("/evenements/ancien-slug");

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe("/evenements/concert-descartes-2026");
  });

  it("returns a real 404 for a slug URL matching neither a live event nor a redirect", async () => {
    const app = express();
    registerStatic(app, createRepo(null, null));

    const response = await request(app).get("/evenements/inconnu");

    expect(response.status).toBe(404);
    expect(response.text).toBe("<h1>Index</h1>");
  });

  it("serves SSR-rendered HTML for known static application routes", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/contact");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<html><body>SSR:/contact</body></html>");
    expect(response.headers["x-robots-tag"]).toBeUndefined();
  });

  // express.static serves index.html for "/" by default *before* any later handler runs;
  // without `index: false` this route would silently bypass SSR and serve the raw shell.
  it("serves SSR-rendered HTML for the home route rather than the raw index.html shell", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<html><body>SSR:/</body></html>");
  });

  it("sets a noindex header for the backoffice root, serving the plain shell (not SSR)", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/backoffice");

    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBe("noindex");
    expect(response.text).toBe("<h1>Index</h1>");
    expect(renderMock).not.toHaveBeenCalled();
  });

  it("sets a noindex header for nested backoffice routes", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/backoffice/events");

    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBe("noindex");
  });

  it("sets a noindex header for authentication routes", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/login");

    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBe("noindex");
  });

  it("returns a real 404 with the plain shell for an unknown application route", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/some/unknown/route");

    expect(response.status).toBe(404);
    expect(response.text).toBe("<h1>Index</h1>");
    expect(renderMock).not.toHaveBeenCalled();
  });

  it("skips the dev-middleware delegation entirely in production", async () => {
    process.env.NODE_ENV = "production";
    const devMiddlewares = jest.fn();
    (createSsrRenderer as jest.Mock).mockResolvedValueOnce({ render: renderMock, devMiddlewares });

    const app = express();
    registerStatic(app, createRepo(null));

    await request(app).get("/contact");

    expect(devMiddlewares).not.toHaveBeenCalled();
  });

  it("delegates to the renderer's dev middlewares outside production", async () => {
    const devMiddlewares = jest.fn((_req, res, next) => {
      res.set("x-dev-middleware", "hit");
      next();
    });
    (createSsrRenderer as jest.Mock).mockResolvedValueOnce({ render: renderMock, devMiddlewares });

    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/contact");

    expect(devMiddlewares).toHaveBeenCalled();
    expect(response.headers["x-dev-middleware"]).toBe("hit");
  });

  it("falls through to the route handler when the renderer has no dev middlewares", async () => {
    (createSsrRenderer as jest.Mock).mockResolvedValueOnce({ render: renderMock });

    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/contact");

    expect(response.status).toBe(200);
  });
});
