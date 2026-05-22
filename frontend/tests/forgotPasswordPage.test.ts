import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import ForgotPasswordPage from "../src/pages/ForgotPasswordPage.vue";
import { createTestRouter } from "./testRouter";
import { useAuthStore } from "../src/stores/auth";

describe("ForgotPasswordPage", () => {
  const setup = async () => {
    const router = createTestRouter("/forgot-password");
    await router.isReady();
    const pinia = createPinia();
    render(ForgotPasswordPage, { global: { plugins: [pinia, router] } });
    return { router, pinia };
  };

  it("shows error on request failure", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "requestPasswordResetWithEmail").mockRejectedValue(new Error("Bad"));

    await fireEvent.update(screen.getByLabelText("Email"), "user@test");
    await fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    expect(await screen.findByText("Bad")).toBeInTheDocument();
  });

  it("shows success after request", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "requestPasswordResetWithEmail").mockImplementation(async () => {
      authStore.passwordResetRequestSent = true;
    });

    await fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    expect(await screen.findByText("Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.")).toBeInTheDocument();
  });

  it("navigates to login", async () => {
    const { router } = await setup();
    const pushSpy = vi.spyOn(router, "push");

    await fireEvent.click(screen.getByRole("button", { name: "Retour à la connexion" }));

    expect(pushSpy).toHaveBeenCalledWith("/login");
  });
});