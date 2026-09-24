import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createHead } from "@unhead/vue/server";
import { transformHtmlTemplate } from "unhead/server";
import { createMemoryHistory, createRouter } from "vue-router";
import { useEventStructuredData, useWebsiteStructuredData } from "../src/composables/useStructuredData";
import { SITE_URL_KEY } from "../src/composables/useSiteUrl";
import type { EventItem, EventOccurrence } from "../src/api/events";

const BASE_TEMPLATE = "<!doctype html><html><head><title>R3ne</title></head><body></body></html>";

const extractJsonLd = (html: string): unknown => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error(`JSON-LD script not found in: ${html}`);
  }
  return JSON.parse(match[1]);
};

const renderWith = async (setup: () => void, path = "/") => {
  const TestComponent = defineComponent({
    setup() {
      setup();
      return () => h("div", "content");
    }
  });

  const app = createSSRApp(TestComponent);
  const head = createHead();
  app.use(head);
  app.provide(SITE_URL_KEY, "https://rene.example.org");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: TestComponent }]
  });
  app.use(router);
  await router.push(path);
  await router.isReady();

  await renderToString(app);
  return transformHtmlTemplate(head, BASE_TEMPLATE);
};

const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence => ({
  id: "occ-1",
  venueName: "Salle des fêtes",
  address: "1 rue du centre",
  postalCode: "37160",
  city: "Descartes",
  latitude: null,
  longitude: null,
  eventStartAt: "2026-06-15T20:00:00.000Z",
  eventEndAt: "2026-06-15T22:00:00.000Z",
  allDay: false,
  ...overrides
});

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert au parc",
  content: "<p>Une belle soirée en plein air.</p>",
  image: null,
  categoryId: "music",
  audienceId: null,
  occurrences: [buildOccurrence()],
  organizerName: null,
  status: "PUBLISHED",
  ...overrides
});

describe("useWebsiteStructuredData", () => {
  it("emits a WebSite JSON-LD object with the site name and absolute URL", async () => {
    const html = await renderWith(() => useWebsiteStructuredData(() => "R3ne"));

    const jsonLd = extractJsonLd(html);
    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "R3ne",
      url: "https://rene.example.org/"
    });
  });
});

describe("useEventStructuredData", () => {
  it("emits nothing when there is no event", async () => {
    const html = await renderWith(() => useEventStructuredData(() => null));

    expect(html).not.toContain("application/ld+json");
  });

  it("emits nothing when the event has no occurrences", async () => {
    const html = await renderWith(() => useEventStructuredData(() => buildEvent({ occurrences: [] })));

    expect(html).not.toContain("application/ld+json");
  });

  it("emits a single Event object for a single dated, non-all-day occurrence", async () => {
    const html = await renderWith(() => useEventStructuredData(() => buildEvent()), "/evenements/concert-descartes-2026");

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Event");
    expect(jsonLd.name).toBe("Concert au parc");
    expect(jsonLd.url).toBe("https://rene.example.org/evenements/concert-descartes-2026");
    expect(jsonLd.startDate).toBe("2026-06-15T20:00:00.000Z");
    expect(jsonLd.endDate).toBe("2026-06-15T22:00:00.000Z");
    expect(jsonLd.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(jsonLd.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
    expect(jsonLd.description).toBe("Une belle soirée en plein air.");
    expect(jsonLd.location).toEqual({
      "@type": "Place",
      name: "Salle des fêtes",
      address: {
        "@type": "PostalAddress",
        addressCountry: "FR",
        streetAddress: "1 rue du centre",
        postalCode: "37160",
        addressLocality: "Descartes"
      }
    });
    expect(jsonLd.image).toBeUndefined();
    expect(jsonLd.organizer).toBeUndefined();
    expect(jsonLd.offers).toBeUndefined();
  });

  it("formats all-day occurrence dates as date-only, not the padded UTC timestamp", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({
          occurrences: [
            buildOccurrence({
              eventStartAt: "2026-06-15T00:00:00.000Z",
              eventEndAt: "2026-06-16T23:59:59.999Z",
              allDay: true
            })
          ]
        })
      )
    );

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd.startDate).toBe("2026-06-15");
    expect(jsonLd.endDate).toBe("2026-06-16");
  });

  it("omits startDate/endDate when an occurrence has no dates set", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({ occurrences: [buildOccurrence({ eventStartAt: null, eventEndAt: null })] })
      )
    );

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd.startDate).toBeUndefined();
    expect(jsonLd.endDate).toBeUndefined();
  });

  it("includes geo coordinates only when they are resolved", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({ occurrences: [buildOccurrence({ latitude: 46.97, longitude: 0.7 })] })
      )
    );

    const jsonLd = extractJsonLd(html) as { location: Record<string, unknown> };
    expect(jsonLd.location.geo).toEqual({ "@type": "GeoCoordinates", latitude: 46.97, longitude: 0.7 });
  });

  it("emits one Event object per occurrence for a multi-date/multi-site event", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({
          occurrences: [
            buildOccurrence({ id: "occ-1", city: "Descartes" }),
            buildOccurrence({
              id: "occ-2",
              city: "Tours",
              eventStartAt: "2026-06-16T20:00:00.000Z",
              eventEndAt: "2026-06-16T22:00:00.000Z"
            })
          ]
        })
      )
    );

    const jsonLd = extractJsonLd(html) as Array<Record<string, unknown>>;
    expect(Array.isArray(jsonLd)).toBe(true);
    expect(jsonLd).toHaveLength(2);
    expect((jsonLd[0].location as { address: { addressLocality: string } }).address.addressLocality).toBe("Descartes");
    expect((jsonLd[1].location as { address: { addressLocality: string } }).address.addressLocality).toBe("Tours");
  });

  it("includes an absolute image, organizer and ticketing offer when the data is available", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({
          image: "/uploads/concert.jpg",
          organizerName: "Association locale",
          organizerUrl: "https://organisateur.test",
          ticketUrl: "https://billetterie.test"
        })
      )
    );

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd.image).toEqual(["https://rene.example.org/uploads/concert.jpg"]);
    expect(jsonLd.organizer).toEqual({
      "@type": "Organization",
      name: "Association locale",
      url: "https://organisateur.test"
    });
    expect(jsonLd.offers).toEqual({
      "@type": "Offer",
      url: "https://billetterie.test",
      availability: "https://schema.org/InStock"
    });
  });

  it("omits description when the event has no content", async () => {
    const html = await renderWith(() => useEventStructuredData(() => buildEvent({ content: null })));

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd.description).toBeUndefined();
  });

  it("includes an organizer without a URL when none is set", async () => {
    const html = await renderWith(() => useEventStructuredData(() => buildEvent({ organizerName: "Association locale" })));

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd.organizer).toEqual({ "@type": "Organization", name: "Association locale" });
  });

  it("omits address sub-fields and the location name when the occurrence has no venue data", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({
          occurrences: [buildOccurrence({ venueName: null, address: null, postalCode: null, city: null })]
        })
      )
    );

    const jsonLd = extractJsonLd(html) as { location: Record<string, unknown> };
    expect(jsonLd.location).toEqual({ "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "FR" } });
  });

  it("still emits structured data for an ended event (no future occurrences)", async () => {
    const html = await renderWith(() =>
      useEventStructuredData(() =>
        buildEvent({
          occurrences: [
            buildOccurrence({ eventStartAt: "2020-01-15T20:00:00.000Z", eventEndAt: "2020-01-15T22:00:00.000Z" })
          ]
        })
      )
    );

    const jsonLd = extractJsonLd(html) as Record<string, unknown>;
    expect(jsonLd.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(jsonLd.startDate).toBe("2020-01-15T20:00:00.000Z");
  });
});
