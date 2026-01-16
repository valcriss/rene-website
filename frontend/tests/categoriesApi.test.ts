import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCategories } from "../src/api/categories";

describe("categories api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches categories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: "music", name: "Musique" }]) }))
    );

    await expect(fetchCategories()).resolves.toEqual([{ id: "music", name: "Musique" }]);
  });

  it("fails to fetch categories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );

    await expect(fetchCategories()).rejects.toThrow("Impossible de charger les catégories");
  });
});
