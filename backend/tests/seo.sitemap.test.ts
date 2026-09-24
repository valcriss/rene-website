import { buildRobotsTxt, buildSitemapXml } from "../src/seo/sitemap";
import { EventRepository } from "../src/events/repository";
import { Event } from "../src/events/types";

const baseEvent: Event = {
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

const buildRepo = (events: Event[]): EventRepository =>
  ({
    list: async () => events
  }) as unknown as EventRepository;

describe("buildRobotsTxt", () => {
  it("disallows private routes and points to the sitemap", () => {
    const robotsTxt = buildRobotsTxt("https://rene.example.org");

    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Disallow: /backoffice");
    expect(robotsTxt).toContain("Disallow: /login");
    expect(robotsTxt).toContain("Disallow: /signup");
    expect(robotsTxt).toContain("Disallow: /forgot-password");
    expect(robotsTxt).toContain("Disallow: /reset-password");
    expect(robotsTxt).toContain("Sitemap: https://rene.example.org/sitemap.xml");
  });
});

describe("buildSitemapXml", () => {
  it("includes the static public pages even with no events", async () => {
    const xml = await buildSitemapXml(buildRepo([]), "https://rene.example.org");

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://rene.example.org/</loc>");
    expect(xml).toContain("<loc>https://rene.example.org/contact</loc>");
    expect(xml).toContain("<loc>https://rene.example.org/mentions-legales</loc>");
  });

  it("lists a published, non-archived event at its canonical slug URL with a lastmod", async () => {
    const xml = await buildSitemapXml(buildRepo([baseEvent]), "https://rene.example.org");

    expect(xml).toContain("<loc>https://rene.example.org/evenements/concert-descartes-2026</loc>");
    expect(xml).toContain("<lastmod>2026-01-02T00:00:00.000Z</lastmod>");
  });

  it("excludes draft, pending and rejected events", async () => {
    const events: Event[] = [
      { ...baseEvent, id: "draft", slug: "draft-slug", status: "DRAFT" },
      { ...baseEvent, id: "pending", slug: "pending-slug", status: "PENDING" },
      { ...baseEvent, id: "rejected", slug: "rejected-slug", status: "REJECTED" }
    ];

    const xml = await buildSitemapXml(buildRepo(events), "https://rene.example.org");

    expect(xml).not.toContain("draft-slug");
    expect(xml).not.toContain("pending-slug");
    expect(xml).not.toContain("rejected-slug");
  });

  it("excludes an archived event even if it was published", async () => {
    const events: Event[] = [{ ...baseEvent, archivedAt: "2026-02-01T00:00:00.000Z" }];

    const xml = await buildSitemapXml(buildRepo(events), "https://rene.example.org");

    expect(xml).not.toContain("concert-descartes-2026");
  });

  it("excludes a published event that has no slug yet", async () => {
    const events: Event[] = [{ ...baseEvent, slug: null }];

    const xml = await buildSitemapXml(buildRepo(events), "https://rene.example.org");

    expect(xml).not.toContain("/evenements/");
  });

  it("escapes special XML characters found in the configured site URL", async () => {
    const xml = await buildSitemapXml(buildRepo([]), "https://rene.example.org?a=1&b=2");

    expect(xml).toContain("https://rene.example.org?a=1&amp;b=2/");
    expect(xml).not.toContain("a=1&b=2");
  });
});
