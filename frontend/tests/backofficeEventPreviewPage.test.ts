import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BackofficeEventPreviewPage from "../src/pages/backoffice/BackofficeEventPreviewPage.vue";
import { createTestRouter } from "./testRouter";

describe("BackofficeEventPreviewPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the preview from stored snapshot", async () => {
    window.localStorage.setItem(
      "rene-website-preview:preview-1",
      JSON.stringify({
        token: "preview-1",
        event: {
          id: "preview-event",
          title: "Atelier photo",
          content: "<p>Contenu de preview</p>",
          image: "",
          categoryId: "music",
          eventStartAt: "2030-01-15T20:00:00.000Z",
          eventEndAt: "2030-01-15T22:00:00.000Z",
          venueName: "Salle des fêtes",
          city: "Descartes",
          latitude: 46.97,
          longitude: 0.7,
          status: "DRAFT"
        }
      })
    );

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));

    const router = createTestRouter("/backoffice/events/preview?preview=preview-1");
    await router.isReady();
    const pinia = createPinia();

    render(BackofficeEventPreviewPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    expect(await screen.findByText("Aperçu")).toBeInTheDocument();
    expect(screen.getByText("Atelier photo")).toBeInTheDocument();
    expect(screen.getByText("Contenu de preview")).toBeInTheDocument();
  });
});
