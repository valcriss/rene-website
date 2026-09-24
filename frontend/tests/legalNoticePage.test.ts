import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import LegalNoticePage from "../src/pages/LegalNoticePage.vue";
import { createTestRouter } from "./testRouter";

describe("LegalNoticePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setup = async () => {
    const router = createTestRouter("/mentions-legales");
    await router.isReady();
    const pinia = createPinia();
    render(LegalNoticePage, { global: { plugins: [pinia, router] } });
    return { router, pinia };
  };

  it("shows the legal notice content once loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ homepageIntro: "", homepageSubtitle: "", legalNotice: "Éditeur : R3ne SAS" })
        })
      )
    );

    await setup();

    expect(await screen.findByText("Éditeur : R3ne SAS")).toBeInTheDocument();
  });

  it("shows a fallback message when no legal notice is configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homepageIntro: "", homepageSubtitle: "", legalNotice: "" })
        })
      )
    );

    await setup();

    expect(await screen.findByText("Aucune mention légale n'a été renseignée pour le moment.")).toBeInTheDocument();
  });

  it("navigates to home", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false })));
    const { router } = await setup();
    const pushSpy = vi.spyOn(router, "push");

    await fireEvent.click(screen.getByRole("button", { name: "Retour à l'accueil" }));

    expect(pushSpy).toHaveBeenCalledWith("/");
  });
});
