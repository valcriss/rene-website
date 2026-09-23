import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminAudience,
  createAdminCategory,
  createAdminUser,
  deleteAdminAudience,
  deleteAdminCategory,
  deleteAdminUser,
  fetchAdminAudiences,
  fetchAdminCategories,
  fetchAdminSettings,
  fetchAdminUsers,
  updateAdminAudience,
  updateAdminCategory,
  updateAdminSettings,
  updateAdminUser
} from "../src/api/admin";
import { setSessionExpiredHandler } from "../src/api/authHeaders";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("admin api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSessionExpiredHandler(() => {});
  });

  it("fetches users, categories, settings", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contactEmail: "c", contactPhone: "p", homepageIntro: "i", homepageSubtitle: "s" })
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminUsers("ADMIN")).resolves.toEqual([]);
    await expect(fetchAdminCategories("ADMIN")).resolves.toEqual([]);
    await expect(fetchAdminSettings("ADMIN")).resolves.toEqual({
      contactEmail: "c",
      contactPhone: "p",
      homepageIntro: "i",
      homepageSubtitle: "s"
    });
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
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contactEmail: "c", contactPhone: "p", homepageIntro: "i", homepageSubtitle: "s" })
        })
      )
    );

    await expect(
      updateAdminSettings("ADMIN", { contactEmail: "c", contactPhone: "p", homepageIntro: "i", homepageSubtitle: "s" })
    ).resolves.toMatchObject({ contactEmail: "c" });
  });

  it("fails to update settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );

    await expect(
      updateAdminSettings("ADMIN", { contactEmail: "c", contactPhone: "p", homepageIntro: "i", homepageSubtitle: "s" })
    ).rejects.toThrow("Impossible de mettre à jour les réglages");
  });

  it("fetches, creates, updates and deletes admin audiences", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "1", name: "Adultes" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "1", name: "Jeunes" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminAudiences("ADMIN")).resolves.toEqual([]);
    await expect(createAdminAudience("ADMIN", { name: "Adultes" })).resolves.toMatchObject({ id: "1" });
    await expect(updateAdminAudience("ADMIN", "1", { name: "Jeunes" })).resolves.toMatchObject({ id: "1" });
    await expect(deleteAdminAudience("ADMIN", "1")).resolves.toBeUndefined();
  });

  it("fails to fetch or mutate admin audiences", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminAudiences("ADMIN")).rejects.toThrow("Impossible de charger les publics concernés");
    await expect(createAdminAudience("ADMIN", { name: "Adultes" })).rejects.toThrow(
      "Impossible de créer le public concerné"
    );
    await expect(updateAdminAudience("ADMIN", "1", { name: "Jeunes" })).rejects.toThrow(
      "Impossible de mettre à jour le public concerné"
    );
    await expect(deleteAdminAudience("ADMIN", "1")).rejects.toThrow("Impossible de supprimer le public concerné");
  });

  it("triggers the session-expired handler instead of throwing on a 401, for every admin endpoint", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }))
    );

    const calls = [
      fetchAdminUsers("ADMIN"),
      createAdminUser("ADMIN", { name: "A", email: "a", role: "EDITOR" }),
      updateAdminUser("ADMIN", "1", { name: "A", email: "a", role: "EDITOR" }),
      deleteAdminUser("ADMIN", "1"),
      fetchAdminCategories("ADMIN"),
      createAdminCategory("ADMIN", { name: "Musique" }),
      updateAdminCategory("ADMIN", "1", { name: "Musique" }),
      deleteAdminCategory("ADMIN", "1"),
      fetchAdminSettings("ADMIN"),
      updateAdminSettings("ADMIN", { contactEmail: "c", contactPhone: "p", homepageIntro: "i", homepageSubtitle: "s" }),
      fetchAdminAudiences("ADMIN"),
      createAdminAudience("ADMIN", { name: "Adultes" }),
      updateAdminAudience("ADMIN", "1", { name: "Adultes" }),
      deleteAdminAudience("ADMIN", "1")
    ];
    const settledFlags = calls.map(() => false);
    calls.forEach((call, index) => {
      call.then(
        () => (settledFlags[index] = true),
        () => (settledFlags[index] = true)
      );
    });

    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(calls.length);
    expect(settledFlags.every((settled) => settled === false)).toBe(true);
  });
});
