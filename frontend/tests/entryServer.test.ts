import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../src/entry-server";

const jsonResponse = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body)
  });

describe("entry-server render", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/api/public/events")) {
          return jsonResponse([]);
        }
        if (url.includes("/api/categories")) {
          return jsonResponse([]);
        }
        if (url.includes("/api/audiences")) {
          return jsonResponse([]);
        }
        if (url.includes("/api/settings")) {
          return jsonResponse({});
        }
        return jsonResponse([]);
      })
    );
  });

  it("renders the home page with editorial content and a link to the agenda navigation", async () => {
    const result = await render("/");

    expect(result.html).toContain("R3ne");
    expect(result.html).toContain("<header");
    expect(result.stateScript).toContain('id="__PINIA_STATE__"');
  });

  it("renders a published event's H1, description and location", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/api/public/events")) {
          return jsonResponse([
            {
              id: "1",
              title: "Concert au parc",
              content: "<p>Une belle soirée en plein air.</p>",
              image: null,
              categoryId: "music",
              audienceId: null,
              occurrences: [
                {
                  id: "occ-1",
                  eventStartAt: "2026-06-15T20:00:00.000Z",
                  eventEndAt: "2026-06-15T22:00:00.000Z",
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
              status: "PUBLISHED",
              publishedAt: "2026-01-01T00:00:00.000Z",
              publicationEndAt: "2026-06-15T22:00:00.000Z",
              archivedAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z"
            }
          ]);
        }
        return jsonResponse([]);
      })
    );

    const result = await render("/event/1");

    expect(result.html).toContain("Concert au parc");
    expect(result.html).toContain("Une belle soirée en plein air.");
    expect(result.html).toContain("Descartes");
  });

  it("renders the not-found page for an unknown route", async () => {
    const result = await render("/this/route/does/not/exist");

    expect(result.html).toContain("Page introuvable");
  });

  it("escapes </script> sequences from event content when serializing the hydration state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/api/public/events")) {
          return jsonResponse([
            {
              id: "1",
              title: "Concert",
              content: "<p>Texte</p></script><script>alert(1)</script>",
              image: null,
              categoryId: null,
              audienceId: null,
              occurrences: [],
              organizerName: null,
              status: "PUBLISHED",
              publishedAt: "2026-01-01T00:00:00.000Z",
              publicationEndAt: "2026-06-15T22:00:00.000Z",
              archivedAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z"
            }
          ]);
        }
        return jsonResponse([]);
      })
    );

    const result = await render("/event/1");

    const scriptBody = result.stateScript.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(scriptBody).not.toContain("</script>");
    expect(scriptBody).toContain("\\u003c/script>");
  });
});
