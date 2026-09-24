import { describe, it, expect, vi, beforeEach } from "vitest";
import { transformHtmlTemplate } from "unhead/server";
import { render } from "../src/entry-server";

// Regression checklist for the "essential SEO elements" acceptance criterion of issue #58:
// title, description, canonical, Open Graph, JSON-LD, a single H1 and (per #57) no hreflang, on
// every representative *indexable* public page. Deliberately zero-infra (mocked fetch, real Vue
// SSR render, no server/DB) so it runs as a normal, deterministic part of `npm test` and fails
// the build the moment one of these elements regresses — no flaky numeric threshold involved.
const BASE_TEMPLATE = "<!doctype html><html><head><title>R3ne</title></head><body></body></html>";

const jsonResponse = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body)
  });

const representativeEvent = {
  id: "1",
  title: "Concert au parc",
  content: "<p>Une belle soirée en plein air, au cœur du parc municipal.</p>",
  image: "/uploads/concert.jpg",
  imageAlt: "Public assis devant le kiosque du parc",
  categoryId: "music",
  audienceId: null,
  occurrences: [
    {
      id: "occ-1",
      eventStartAt: "2030-06-15T20:00:00.000Z",
      eventEndAt: "2030-06-15T22:00:00.000Z",
      allDay: false,
      venueName: "Kiosque",
      address: "",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7
    }
  ],
  organizerName: "Association locale",
  slug: "concert-au-parc-descartes-2030",
  status: "PUBLISHED",
  publishedAt: "2030-01-01T00:00:00.000Z",
  publicationEndAt: "2030-06-15T22:00:00.000Z",
  archivedAt: null,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z"
};

const stubEvents = (events: unknown[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/public/events")) {
        return jsonResponse(events);
      }
      return jsonResponse([]);
    })
  );
};

const countOccurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const renderFull = async (path: string) => {
  const result = await render(path, "https://rene.example.org");
  const fullHtml = transformHtmlTemplate(result.head, BASE_TEMPLATE);
  return { html: result.html, fullHtml };
};

const expectEssentialSeoElements = (fullHtml: string, expectedOgType: "website" | "article") => {
  expect(fullHtml).not.toContain("<title>R3ne</title>"); // a real, page-specific title, not the generic fallback
  expect(fullHtml).toMatch(/<meta name="description" content="[^"]+">/);
  expect(fullHtml).toMatch(/<link rel="canonical" href="https:\/\/rene\.example\.org[^"]*">/);
  expect(fullHtml).toMatch(/<meta property="og:title" content="[^"]+">/);
  expect(fullHtml).toMatch(/<meta property="og:description" content="[^"]+">/);
  expect(fullHtml).toMatch(/<meta property="og:url" content="https:\/\/rene\.example\.org[^"]*">/);
  expect(fullHtml).toMatch(/<meta property="og:image" content="https:\/\/rene\.example\.org[^"]*">/);
  expect(fullHtml).toContain(`<meta property="og:type" content="${expectedOgType}">`);
  expect(fullHtml).toContain('<meta name="twitter:card" content="summary_large_image">');
  // #57: the site is indexed in French only — no page ever announces a translated equivalent.
  expect(fullHtml).not.toContain("hreflang");
};

describe("SEO regression checklist (issue #58)", () => {
  beforeEach(() => {
    stubEvents([representativeEvent]);
  });

  it("home page carries every essential SEO element, one H1, and WebSite structured data", async () => {
    const { html, fullHtml } = await renderFull("/");

    expectEssentialSeoElements(fullHtml, "website");
    expect(fullHtml).toContain('<script type="application/ld+json">');
    expect(fullHtml).toContain('"@type":"WebSite"');
    expect(countOccurrences(html, "<h1")).toBe(1);
  });

  it("an event detail page carries every essential SEO element, one H1, and Event structured data", async () => {
    const { html, fullHtml } = await renderFull("/evenements/concert-au-parc-descartes-2030");

    expectEssentialSeoElements(fullHtml, "article");
    expect(fullHtml).toContain('<script type="application/ld+json">');
    expect(fullHtml).toContain('"@type":"Event"');
    expect(fullHtml).toContain("Descartes");
    expect(countOccurrences(html, "<h1")).toBe(1);
  });

  it("the evergreen weekend agenda page carries every essential SEO element and one H1, even with no matching events", async () => {
    stubEvents([]);
    const { html, fullHtml } = await renderFull("/agenda/ce-week-end");

    expectEssentialSeoElements(fullHtml, "website");
    expect(countOccurrences(html, "<h1")).toBe(1);
  });

  it("a city agenda page carries every essential SEO element and one H1", async () => {
    const { html, fullHtml } = await renderFull("/agenda/ville/descartes");

    expectEssentialSeoElements(fullHtml, "website");
    expect(countOccurrences(html, "<h1")).toBe(1);
  });

  it("the legal notice page carries every essential SEO element and one H1", async () => {
    stubEvents([]);
    const { html, fullHtml } = await renderFull("/mentions-legales");

    expectEssentialSeoElements(fullHtml, "website");
    expect(countOccurrences(html, "<h1")).toBe(1);
  });

  it("never emits page-specific SEO metadata for a genuinely unknown route", async () => {
    const { fullHtml } = await renderFull("/this/route/does/not/exist");

    expect(fullHtml).toContain("<title>R3ne</title>");
    expect(fullHtml).not.toContain('name="description"');
    expect(fullHtml).not.toContain('rel="canonical"');
    expect(fullHtml).not.toContain('property="og:');
  });
});
