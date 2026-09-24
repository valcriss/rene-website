import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCategorySubscriptions, updateCategorySubscription } from "../src/api/subscriptions";
import { setSessionExpiredHandler } from "../src/api/authHeaders";

describe("subscriptions api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSessionExpiredHandler(() => {});
  });

  it("fetches category subscriptions", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: "music", name: "Musique", subscribed: true }])
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCategorySubscriptions("MODERATOR")).resolves.toEqual([
      { id: "music", name: "Musique", subscribed: true }
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/api/subscriptions/categories", expect.any(Object));
  });

  it("throws when fetching subscriptions fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 400 })));

    await expect(fetchCategorySubscriptions("MODERATOR")).rejects.toThrow(
      "Impossible de charger les abonnements aux notifications"
    );
  });


  it("updates a category subscription", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);

    await updateCategorySubscription("MODERATOR", "music", false);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/subscriptions/categories/music",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ subscribed: false }) })
    );
  });

  it("throws when updating a subscription fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 400 })));

    await expect(updateCategorySubscription("MODERATOR", "music", false)).rejects.toThrow(
      "Impossible de mettre à jour l'abonnement"
    );
  });

  it("triggers the session-expired handler instead of throwing on a 401, for every endpoint", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }))
    );

    const calls = [fetchCategorySubscriptions("MODERATOR"), updateCategorySubscription("MODERATOR", "music", false)];
    const settledFlags = calls.map(() => false);
    calls.forEach((call, index) => {
      call.then(
        () => (settledFlags[index] = true),
        () => (settledFlags[index] = true)
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(calls.length);
    expect(settledFlags.every((settled) => settled === false)).toBe(true);
  });
});
