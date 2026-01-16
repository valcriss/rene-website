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

  it("does not reload when already loaded", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal("fetch", fetchMock);

    const store = useCategoriesStore();
    await store.loadCategories();
    await store.loadCategories();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
