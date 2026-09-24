import path from "node:path";
import { promises as fs } from "node:fs";
import express from "express";
import request from "supertest";
import { registerStatic } from "../src/static";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";

const frontendDist = path.resolve(__dirname, "../../frontend/dist");

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

const createRepo = (event: Event | null): EventRepository => ({
  list: async () => (event ? [event] : []),
  getById: async () => event,
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
  beforeAll(async () => {
    await fs.mkdir(frontendDist, { recursive: true });
    await fs.writeFile(path.join(frontendDist, "index.html"), "<h1>Index</h1>");
    await fs.writeFile(path.join(frontendDist, "hello.txt"), "hello");
  });

  afterAll(async () => {
    await fs.rm(frontendDist, { recursive: true, force: true });
  });

  it("serves static assets", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/hello.txt");

    expect(response.status).toBe(200);
    expect(response.text).toBe("hello");
  });

  it("returns a JSON 404 for an unmatched API route", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Route API introuvable." });
  });

  it("returns 200 for a published, non-archived event page", async () => {
    const app = express();
    registerStatic(app, createRepo(baseEvent));

    const response = await request(app).get("/event/published");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<h1>Index</h1>");
  });

  it("returns 410 for an event that was intentionally archived", async () => {
    const app = express();
    registerStatic(app, createRepo({ ...baseEvent, archivedAt: "2026-02-01T00:00:00.000Z" }));

    const response = await request(app).get("/event/published");

    expect(response.status).toBe(410);
    expect(response.text).toBe("<h1>Index</h1>");
  });

  it("returns 404 for an unknown or never-published event id", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/event/missing");

    expect(response.status).toBe(404);
    expect(response.text).toBe("<h1>Index</h1>");
  });

  it("serves index.html for known static application routes", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/contact");

    expect(response.status).toBe(200);
    expect(response.text).toBe("<h1>Index</h1>");
    expect(response.headers["x-robots-tag"]).toBeUndefined();
  });

  it("sets a noindex header for backoffice routes", async () => {
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

  it("returns a real 404 for an unknown application route", async () => {
    const app = express();
    registerStatic(app, createRepo(null));

    const response = await request(app).get("/some/unknown/route");

    expect(response.status).toBe(404);
    expect(response.text).toBe("<h1>Index</h1>");
  });
});
