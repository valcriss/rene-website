import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import LoginPage from "../src/pages/LoginPage.vue";
import { createTestRouter } from "./testRouter";
import { useAuthStore } from "../src/stores/auth";

describe("LoginPage", () => {
  const setup = async () => {
    const router = createTestRouter("/login");
    await router.isReady();
    const pinia = createPinia();
    render(LoginPage, { global: { plugins: [pinia, router] } });
    return { router, pinia };
  };

  it("shows error on login failure", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "loginWithPassword").mockRejectedValue(new Error("Bad"));

    await fireEvent.update(screen.getByLabelText("Email"), "user@test");
    await fireEvent.update(screen.getByLabelText("Mot de passe"), "secret");
    await fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Bad")).toBeInTheDocument();
  });

  it("shows fallback error on unknown failure", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "loginWithPassword").mockRejectedValue("nope");

    await fireEvent.update(screen.getByLabelText("Email"), "user@test");
    await fireEvent.update(screen.getByLabelText("Mot de passe"), "secret");
    await fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Connexion impossible")).toBeInTheDocument();
  });

  it("navigates to home", async () => {
    const { router } = await setup();
    const pushSpy = vi.spyOn(router, "push");

    await fireEvent.click(screen.getByRole("button", { name: "Retour au site" }));

    expect(pushSpy).toHaveBeenCalledWith("/");
  });
});
