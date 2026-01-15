import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminCategory,
  createAdminUser,
  deleteAdminCategory,
  deleteAdminUser,
  fetchAdminCategories,
  fetchAdminSettings,
  fetchAdminUsers,
  updateAdminCategory,
  updateAdminSettings,
  updateAdminUser
} from "../src/api/admin";

describe("admin api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches users, categories, settings", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contactEmail: "c", contactPhone: "p", homepageIntro: "i" })
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminUsers("ADMIN")).resolves.toEqual([]);
    await expect(fetchAdminCategories("ADMIN")).resolves.toEqual([]);
    await expect(fetchAdminSettings("ADMIN")).resolves.toEqual({ contactEmail: "c", contactPhone: "p", homepageIntro: "i" });
  });

  it("fails to fetch admin data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );

    await expect(fetchAdminUsers("ADMIN")).rejects.toThrow("Impossible de charger les utilisateurs");
    await expect(fetchAdminCategories("ADMIN")).rejects.toThrow("Impossible de charger les catégories");
    await expect(fetchAdminSettings("ADMIN")).rejects.toThrow("Impossible de charger les réglages");
  });

  it("creates updates and deletes admin users", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "1", name: "A", email: "a", role: "EDITOR" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "1", name: "B", email: "b", role: "MODERATOR" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    vi.stubGlobal("fetch", fetchMock);

    await expect(createAdminUser("ADMIN", { name: "A", email: "a", role: "EDITOR" })).resolves.toMatchObject({ id: "1" });
    await expect(updateAdminUser("ADMIN", "1", { name: "B", email: "b", role: "MODERATOR" })).resolves.toMatchObject({ id: "1" });
    await expect(deleteAdminUser("ADMIN", "1")).resolves.toBeUndefined();
  });

  it("fails to mutate admin users", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createAdminUser("ADMIN", { name: "A", email: "a", role: "EDITOR" })).rejects.toThrow(
      "Impossible de créer l'utilisateur"
    );
    await expect(updateAdminUser("ADMIN", "1", { name: "B", email: "b", role: "MODERATOR" })).rejects.toThrow(
      "Impossible de mettre à jour l'utilisateur"
    );
    await expect(deleteAdminUser("ADMIN", "1")).rejects.toThrow("Impossible de supprimer l'utilisateur");
  });

  it("creates updates and deletes admin categories", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "1", name: "Musique" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "1", name: "Jazz" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    vi.stubGlobal("fetch", fetchMock);

    await expect(createAdminCategory("ADMIN", { name: "Musique" })).resolves.toMatchObject({ id: "1" });
    await expect(updateAdminCategory("ADMIN", "1", { name: "Jazz" })).resolves.toMatchObject({ id: "1" });
    await expect(deleteAdminCategory("ADMIN", "1")).resolves.toBeUndefined();
  });

  it("fails to mutate admin categories", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createAdminCategory("ADMIN", { name: "Musique" })).rejects.toThrow(
      "Impossible de créer la catégorie"
    );
    await expect(updateAdminCategory("ADMIN", "1", { name: "Jazz" })).rejects.toThrow(
      "Impossible de mettre à jour la catégorie"
    );
    await expect(deleteAdminCategory("ADMIN", "1")).rejects.toThrow("Impossible de supprimer la catégorie");
  });

  it("updates settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ contactEmail: "c", contactPhone: "p", homepageIntro: "i" }) })
      )
    );

    await expect(
      updateAdminSettings("ADMIN", { contactEmail: "c", contactPhone: "p", homepageIntro: "i" })
    ).resolves.toMatchObject({ contactEmail: "c" });
  });

  it("fails to update settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    await expect(
      updateAdminSettings("ADMIN", { contactEmail: "c", contactPhone: "p", homepageIntro: "i" })
    ).rejects.toThrow("Impossible de mettre à jour les réglages");
  });
});