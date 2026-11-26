import { afterEach, describe, expect, it, vi } from "vitest";
import { authFetch, getLastSessionRefreshAt, refreshAccessSession } from "../src/api/authFetch";

type MockResponse = { ok: boolean; status: number };

const response = (status: number): MockResponse => ({ ok: status >= 200 && status < 300, status });

const setCsrfCookie = (value: string) => {
  document.cookie = `rene_csrf=${value}; path=/`;
};

describe("authFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "rene_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("returns non-401 responses untouched without refreshing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await authFetch("/api/events", { headers: { "Content-Type": "application/json" } });

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired access token once and replays the request with the rotated CSRF token", async () => {
    setCsrfCookie("old");
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/auth/refresh") {
        setCsrfCookie("rotated");
        return Promise.resolve(response(200));
      }
      return Promise.resolve(response(fetchMock.mock.calls.length === 1 ? 401 : 201));
    });
    vi.stubGlobal("fetch", fetchMock);
    const before = Date.now();

    const result = await authFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": "old" },
      body: "{}"
    });

    expect(result.status).toBe(201);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/events", "/api/auth/refresh", "/api/events"]);
    expect(fetchMock.mock.calls[2][1]).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": "rotated" },
      body: "{}"
    });
    expect(getLastSessionRefreshAt()).toBeGreaterThanOrEqual(before);
  });

  it("replays a request made without options", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(response(url === "/api/auth/refresh" || fetchMock.mock.calls.length > 2 ? 200 : 401))
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await authFetch("/api/events");

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[2]).toEqual(["/api/events", { headers: {} }]);
  });

  it("returns the original 401 when the session itself has expired", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(401));
    vi.stubGlobal("fetch", fetchMock);

    const result = await authFetch("/api/events");

    expect(result.status).toBe(401);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/events", "/api/auth/refresh"]);
  });

  it("returns the original 401 when the refresh endpoint is unreachable", async () => {
    const fetchMock = vi.fn((url: string) =>
      url === "/api/auth/refresh" ? Promise.reject(new Error("offline")) : Promise.resolve(response(401))
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await authFetch("/api/events");

    expect(result.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares a single refresh between concurrent expired requests", async () => {
    let releaseRefresh: (value: MockResponse) => void = () => {};
    const replays: string[] = [];
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/auth/refresh") {
        return new Promise<MockResponse>((resolve) => {
          releaseRefresh = resolve;
        });
      }
      if (replays.includes(url)) return Promise.resolve(response(200));
      replays.push(url);
      return Promise.resolve(response(401));
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = authFetch("/api/events");
    const second = authFetch("/api/admin/users");
    await vi.waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === "/api/auth/refresh")).toHaveLength(1));
    releaseRefresh(response(200));

    await expect(first).resolves.toMatchObject({ status: 200 });
    await expect(second).resolves.toMatchObject({ status: 200 });
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/auth/refresh")).toHaveLength(1);
  });
});

describe("refreshAccessSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [() => Promise.resolve(response(200)), "refreshed"],
    [() => Promise.resolve(response(401)), "expired"],
    [() => Promise.reject(new Error("offline")), "unavailable"]
  ] as const)("reports the refresh outcome (%#)", async (implementation, expected) => {
    const fetchMock = vi.fn(implementation);
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshAccessSession()).resolves.toBe(expected);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" })
    );
  });

  it("starts a new refresh once the previous one has settled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal("fetch", fetchMock);

    await refreshAccessSession();
    await refreshAccessSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
