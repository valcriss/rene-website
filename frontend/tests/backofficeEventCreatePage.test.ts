import { fireEvent, render, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createTestRouter } from "./testRouter";
import BackofficeEventCreatePage from "../src/pages/backoffice/BackofficeEventCreatePage.vue";

const renderPage = async () => {
  const router = createTestRouter("/backoffice/events/new");
  await router.isReady();
  render(BackofficeEventCreatePage, {
    global: {
      plugins: [createPinia(), router]
    }
  });
  return router;
};

describe("BackofficeEventCreatePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads categories and binds selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: "music", name: "Musique" }])
        })
      )
    );

    await renderPage();

    const select = await screen.findByLabelText("Catégorie");
    await fireEvent.update(select, "music");

    expect((select as HTMLSelectElement).value).toBe("music");
    expect(screen.getByText("Musique")).toBeInTheDocument();
  });

  it("shows empty state when no categories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    await renderPage();

    expect(await screen.findByText("Aucune catégorie disponible.")).toBeInTheDocument();
  });
});
