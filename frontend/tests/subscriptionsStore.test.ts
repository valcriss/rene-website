import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { useSubscriptionsStore } from "../src/stores/subscriptions";
import { useAuthStore } from "../src/stores/auth";

describe("subscriptions store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().login("MODERATOR");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads category subscriptions", async () => {
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

    const store = useSubscriptionsStore();
    await store.loadCategorySubscriptions();

    expect(store.categorySubscriptions).toEqual([
      { id: "music", name: "Musique", subscribed: true },
      { id: "theatre", name: "Théâtre", subscribed: false }
    ]);
    expect(store.subscriptionsError).toBeNull();
  });

  it("records an error when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 400 })));

    const store = useSubscriptionsStore();
    await store.loadCategorySubscriptions();

    expect(store.subscriptionsError).toBe("Impossible de charger les abonnements aux notifications");
  });

  it("falls back to a generic error message when loading rejects without an Error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject("boom")));

    const store = useSubscriptionsStore();
    await store.loadCategorySubscriptions();

    expect(store.subscriptionsError).toBe("Erreur inconnue");
  });

  it("optimistically toggles a subscription and keeps it on success", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);

    const store = useSubscriptionsStore();
    store.categorySubscriptions = [{ id: "music", name: "Musique", subscribed: true }];

    await store.toggleCategorySubscription("music", false);

    expect(store.categorySubscriptions[0].subscribed).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("/api/subscriptions/categories/music", expect.any(Object));
  });

  it("reverts the toggle and records an error on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 400 })));

    const store = useSubscriptionsStore();
    store.categorySubscriptions = [{ id: "music", name: "Musique", subscribed: true }];

    await store.toggleCategorySubscription("music", false);

    expect(store.categorySubscriptions[0].subscribed).toBe(true);
    expect(store.subscriptionsError).toBe("Impossible de mettre à jour l'abonnement");
  });

  it("falls back to a generic error message when toggling rejects without an Error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject("boom")));

    const store = useSubscriptionsStore();
    store.categorySubscriptions = [{ id: "music", name: "Musique", subscribed: true }];

    await store.toggleCategorySubscription("music", false);

    expect(store.subscriptionsError).toBe("Erreur inconnue");
  });

  it("toggles a subscription that is not in the current list without failing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })));

    const store = useSubscriptionsStore();
    store.categorySubscriptions = [];

    await store.toggleCategorySubscription("music", false);

    expect(store.subscriptionsError).toBeNull();
  });
});
