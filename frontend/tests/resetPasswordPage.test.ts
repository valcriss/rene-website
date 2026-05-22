import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import ResetPasswordPage from "../src/pages/ResetPasswordPage.vue";
import { createTestRouter } from "./testRouter";
import { useAuthStore } from "../src/stores/auth";

describe("ResetPasswordPage", () => {
  const setup = async () => {
    const router = createTestRouter("/reset-password?token=test-token");
    await router.isReady();
    const pinia = createPinia();
    render(ResetPasswordPage, { global: { plugins: [pinia, router] } });
    return { router, pinia };
  };

  it("shows error on reset failure", async () => {
    const { pinia } = await setup();
    const authStore = useAuthStore(pinia);
    vi.spyOn(authStore, "confirmPasswordReset").mockRejectedValue(new Error("Bad"));

    await fireEvent.update(screen.getByLabelText("Nouveau mot de passe"), "secret123");
    await fireEvent.update(screen.getByLabelText("Confirmer le nouveau mot de passe"), "secret123");
    await fireEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));

    expect(await screen.findByText("Bad")).toBeInTheDocument();
  });

  it("navigates to login after reset", async () => {
    const { router, pinia } = await setup();
    const authStore = useAuthStore(pinia);
    const pushSpy = vi.spyOn(router, "push");
    const resetSpy = vi.spyOn(authStore, "resetPasswordResetForm");
    vi.spyOn(authStore, "confirmPasswordReset").mockResolvedValue(undefined);

    await fireEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));

    expect(resetSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith("/login");
  });
});