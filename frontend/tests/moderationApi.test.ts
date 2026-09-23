import { vi } from "vitest";
import { archiveEvent, publishEvent, publishEventWithFeatured, rejectEvent, unarchiveEvent, updateEventFeatured } from "../src/api/moderation";
import { setSessionExpiredHandler } from "../src/api/authHeaders";

const mockFetch = (ok: boolean) =>
  vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve({ id: "1" }) }));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("moderation api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSessionExpiredHandler(() => {});
  });

  it("publishes event", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    await publishEvent("1", "MODERATOR");

    expect(fetchMock).toHaveBeenCalledWith("/api/events/1/publish", expect.any(Object));
  });

  it("rejects event", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    await rejectEvent("1", "ADMIN", "Motif");

    expect(fetchMock).toHaveBeenCalledWith("/api/events/1/reject", expect.any(Object));
  });

  it("publishes featured event", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    await publishEventWithFeatured("1", "MODERATOR", true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events/1/publish",
      expect.objectContaining({ body: JSON.stringify({ featured: true }) })
    );
  });

  it("updates featured status after publication", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    await updateEventFeatured("1", "ADMIN", false);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events/1/featured",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ featured: false }) })
    );
  });

  it("archives event", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    await archiveEvent("1", "MODERATOR");

    expect(fetchMock).toHaveBeenCalledWith("/api/events/1/archive", expect.any(Object));
  });

  it("unarchives event", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    await unarchiveEvent("1", "ADMIN");

    expect(fetchMock).toHaveBeenCalledWith("/api/events/1/unarchive", expect.any(Object));
  });

  it("throws on errors", async () => {
    const fetchMock = mockFetch(false);
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishEvent("1", "MODERATOR")).rejects.toThrow("Action de modération impossible");
    await expect(updateEventFeatured("1", "MODERATOR", true)).rejects.toThrow("Action de modération impossible");
  });

  it("triggers the session-expired handler instead of throwing on a 401", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }))
    );

    const pendingPublish = publishEvent("1", "MODERATOR");
    const pendingFeatured = updateEventFeatured("1", "ADMIN", true);
    let publishSettled = false;
    let featuredSettled = false;
    pendingPublish.then(() => (publishSettled = true), () => (publishSettled = true));
    pendingFeatured.then(() => (featuredSettled = true), () => (featuredSettled = true));

    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(publishSettled).toBe(false);
    expect(featuredSettled).toBe(false);
  });
});
