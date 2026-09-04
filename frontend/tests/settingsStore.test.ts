import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { useSettingsStore } from "../src/stores/settings";

describe("settings store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the public homepage intro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ homepageIntro: "Bienvenue", homepageSubtitle: "Sous-titre" })
        })
      )
    );

    const store = useSettingsStore();
    await store.loadPublicSettings();

    expect(store.homepageIntro).toBe("Bienvenue");
    expect(store.homepageSubtitle).toBe("Sous-titre");
    expect(store.hasLoaded).toBe(true);
  });

  it("keeps homepageIntro null on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false })));

    const store = useSettingsStore();
    await store.loadPublicSettings();

    expect(store.homepageIntro).toBeNull();
    expect(store.homepageSubtitle).toBeNull();
    expect(store.hasLoaded).toBe(false);
  });

  it("does not reload when already loaded", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ homepageIntro: "Bienvenue", homepageSubtitle: "Sous-titre" })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = useSettingsStore();
    await store.loadPublicSettings();
    await store.loadPublicSettings();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
