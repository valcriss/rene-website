import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/vue";
import NotFoundPage from "../src/pages/NotFoundPage.vue";
import { createTestRouter } from "./testRouter";

describe("NotFoundPage", () => {
  const setup = async () => {
    const router = createTestRouter("/this/does/not/exist");
    await router.isReady();
    render(NotFoundPage, { global: { plugins: [router] } });
    return { router };
  };

  it("shows the not-found message", async () => {
    await setup();

    expect(screen.getByText("Page introuvable")).toBeInTheDocument();
    expect(screen.getByText("Cette page n'existe pas ou a été déplacée.")).toBeInTheDocument();
  });

  it("links back to the agenda", async () => {
    await setup();

    const link = screen.getByRole("link", { name: "Retour à l'agenda" });
    expect(link).toHaveAttribute("href", "/");
  });
});
