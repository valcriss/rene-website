import express from "express";
import request from "supertest";
import { createSeoRouter } from "../src/seo/routes";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";

const publishedEvent: Event = {
  id: "1",
  title: "Concert",
  content: "Soirée",
  image: null,
  createdByUserId: null,
  categoryId: "music",
  audienceId: "all",
  occurrences: [],
  organizerName: null,
  slug: "concert-descartes-2026",
  status: "PUBLISHED",
  publishedAt: "2026-01-01T00:00:00.000Z",
  publicationEndAt: "2026-01-15T22:00:00.000Z",
  rejectionReason: null,
  archivedAt: null,
  pendingRevision: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z"
};

const buildApp = (repo: EventRepository) => {
  const app = express();
  app.use(createSeoRouter(repo));
  return app;
};

describe("seo routes", () => {
  const originalSiteUrl = process.env.SITE_URL;

  afterEach(() => {
    process.env.SITE_URL = originalSiteUrl;
  });

  it("serves robots.txt as plain text pointing to the sitemap", async () => {
    process.env.SITE_URL = "https://rene.example.org";
    const app = buildApp({ list: async () => [] } as unknown as EventRepository);

    const response = await request(app).get("/robots.txt");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toContain("Sitemap: https://rene.example.org/sitemap.xml");
  });

  it("serves sitemap.xml as XML with the published event's canonical URL", async () => {
    process.env.SITE_URL = "https://rene.example.org";
    const app = buildApp({ list: async () => [publishedEvent] } as unknown as EventRepository);

    const response = await request(app).get("/sitemap.xml");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/xml");
    expect(response.text).toContain("https://rene.example.org/evenements/concert-descartes-2026");
  });

  it("falls back to a localhost URL when SITE_URL is not set", async () => {
    delete process.env.SITE_URL;
    process.env.PORT = "4000";
    const app = buildApp({ list: async () => [] } as unknown as EventRepository);

    const response = await request(app).get("/robots.txt");

    expect(response.text).toContain("Sitemap: http://localhost:4000/sitemap.xml");
  });

  it("returns 500 and logs when the repository fails while building the sitemap", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const repo = {
      list: async () => {
        throw new Error("boom");
      }
    } as unknown as EventRepository;
    const app = buildApp(repo);

    const response = await request(app).get("/sitemap.xml");

    expect(response.status).toBe(500);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
