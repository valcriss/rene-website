import { vi } from "vitest";
import { publishEvent, rejectEvent } from "../src/api/moderation";

const mockFetch = (ok: boolean) =>
  vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve({ id: "1" }) }));

describe("moderation api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("throws on errors", async () => {
    const fetchMock = mockFetch(false);
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishEvent("1", "MODERATOR")).rejects.toThrow("Action de modération impossible");
  });
});
