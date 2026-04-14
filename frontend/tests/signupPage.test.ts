import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import SignupPage from "../src/pages/SignupPage.vue";
import { createTestRouter } from "./testRouter";
import { useAuthStore } from "../src/stores/auth";

describe("SignupPage", () => {
  const setup = async () => {
    const router = createTestRouter("/signup");
    await router.isReady();
    const pinia = createPinia();
    render(SignupPage, { global: { plugins: [pinia, router] } });
    return { router, pinia };
  };

  it("shows error on signup failure", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "signupWithPassword").mockRejectedValue(new Error("Bad"));

    await fireEvent.update(screen.getByLabelText("Nom"), "Writer");
    await fireEvent.update(screen.getByLabelText("Email"), "writer@example.com");
    await fireEvent.update(screen.getByLabelText("Mot de passe"), "secret123");
    await fireEvent.update(screen.getByLabelText("Confirmer le mot de passe"), "secret123");
    await fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Bad")).toBeInTheDocument();
  });

  it("shows fallback error on unknown signup failure", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "signupWithPassword").mockRejectedValue("nope");

    await fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Inscription impossible")).toBeInTheDocument();
  });

  it("navigates to backoffice on signup success", async () => {
    const { router, pinia } = await setup();
    const authStore = useAuthStore(pinia);
    const pushSpy = vi.spyOn(router, "push");
    const resetSpy = vi.spyOn(authStore, "resetSignupForm");
    vi.spyOn(authStore, "signupWithPassword").mockResolvedValue(undefined);

    await fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(resetSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith("/backoffice");
  });

  it("navigates to login", async () => {
    const { router } = await setup();
    const pushSpy = vi.spyOn(router, "push");

    await fireEvent.click(screen.getByRole("button", { name: "J'ai déjà un compte" }));

    expect(pushSpy).toHaveBeenCalledWith("/login");
  });
});