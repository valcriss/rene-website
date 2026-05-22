import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useCategoriesStore } from "../src/stores/categories";

describe("categories store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads categories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: "music", name: "Musique" }]) }))
    );

    const store = useCategoriesStore();
    await store.loadCategories();

    expect(store.categories).toEqual([{ id: "music", name: "Musique" }]);
    expect(store.error).toBeNull();
    expect(store.hasLoaded).toBe(true);
  });

  it("sets error on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );

    const store = useCategoriesStore();
    await store.loadCategories();

    expect(store.categories).toEqual([]);
    expect(store.error).toBe("Impossible de charger les catégories");
  });

  it("handles unknown error values", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject("oops")));

    const store = useCategoriesStore();
    await store.loadCategories();

    expect(store.error).toBe("Erreur inconnue");
  });

  it("does not reload when already loaded", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal("fetch", fetchMock);

    const store = useCategoriesStore();
    await store.loadCategories();
    await store.loadCategories();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not load when already loading", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal("fetch", fetchMock);

    const store = useCategoriesStore();
    store.loading = true;
    await store.loadCategories();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes categories even after initial load", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: "music", name: "Musique" }]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: "theatre", name: "Théâtre" }]) });
    vi.stubGlobal("fetch", fetchMock);

    const store = useCategoriesStore();
    await store.loadCategories();
    await store.refreshCategories();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.categories).toEqual([{ id: "theatre", name: "Théâtre" }]);
    expect(store.hasLoaded).toBe(true);
  });

  it("invalidates categories without clearing current values", () => {
    const store = useCategoriesStore();

    store.categories = [{ id: "music", name: "Musique" }];
    store.hasLoaded = true;
    store.invalidateCategories();

    expect(store.hasLoaded).toBe(false);
    expect(store.categories).toEqual([{ id: "music", name: "Musique" }]);
  });
});
