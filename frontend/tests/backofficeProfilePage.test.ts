import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRouter } from "./testRouter";
import { useAuthStore } from "../src/stores/auth";
import { useSubscriptionsStore } from "../src/stores/subscriptions";
import BackofficeProfilePage from "../src/pages/backoffice/BackofficeProfilePage.vue";

const setup = async (role: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => {
  const router = createTestRouter("/backoffice/profile");
  await router.isReady();
  const pinia = createPinia();
  const authStore = useAuthStore(pinia);
  authStore.setRole(role);
  return { router, pinia, authStore };
};

describe("BackofficeProfilePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows access denied for a role that cannot moderate", async () => {
    const { pinia } = await setup("EDITOR");

    render(BackofficeProfilePage, { global: { plugins: [pinia] } });

    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
  });

  it("shows the account info and loads category subscriptions for a moderator", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: "music", name: "Musique", subscribed: true },
              { id: "theatre", name: "Théâtre", subscribed: false }
            ])
        })
      )
    );
    const { pinia, authStore } = await setup("MODERATOR");
    authStore.userName = "Marie";
    authStore.userEmail = "marie@test.fr";

    render(BackofficeProfilePage, { global: { plugins: [pinia] } });

    expect(screen.getByText("Marie")).toBeInTheDocument();
    expect(screen.getByText("marie@test.fr")).toBeInTheDocument();
    expect(await screen.findByText("Musique")).toBeInTheDocument();
    expect(await screen.findByText("Théâtre")).toBeInTheDocument();
  });

  it("shows a loading state while subscriptions load", async () => {
    const { pinia } = await setup("ADMIN");
    const subscriptionsStore = useSubscriptionsStore(pinia);
    subscriptionsStore.subscriptionsLoading = true;

    render(BackofficeProfilePage, { global: { plugins: [pinia] } });

    expect(screen.getByText(/Chargement de l'administration/i)).toBeInTheDocument();
  });

  it("shows an error state", async () => {
    const { pinia } = await setup("ADMIN");
    const subscriptionsStore = useSubscriptionsStore(pinia);
    subscriptionsStore.subscriptionsError = "Erreur";

    render(BackofficeProfilePage, { global: { plugins: [pinia] } });

    expect(screen.getByText("Erreur")).toBeInTheDocument();
  });

  it("toggles a category subscription", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { pinia } = await setup("MODERATOR");
    const subscriptionsStore = useSubscriptionsStore(pinia);
    subscriptionsStore.categorySubscriptions = [{ id: "music", name: "Musique", subscribed: true }];

    render(BackofficeProfilePage, { global: { plugins: [pinia] } });

    const checkbox = screen.getByLabelText("Musique");
    await fireEvent.click(checkbox);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/subscriptions/categories/music",
      expect.objectContaining({ method: "PUT" })
    );
  });
});
