import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshAccessSession = vi.fn();
const getLastSessionRefreshAt = vi.fn(() => 0);

vi.mock("../src/api/authFetch", () => ({
  refreshAccessSession: () => refreshAccessSession(),
  getLastSessionRefreshAt: () => getLastSessionRefreshAt()
}));

const { KEEP_ALIVE_CHECK_MS, KEEP_ALIVE_INTERVAL_MS, startSessionKeepAlive } = await import(
  "../src/auth/sessionKeepAlive"
);

const MINUTE = 60 * 1000;

const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("startSessionKeepAlive", () => {
  let stop: () => void = () => {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T10:00:00.000Z"));
    refreshAccessSession.mockReset().mockResolvedValue("refreshed");
    getLastSessionRefreshAt.mockReset().mockReturnValue(0);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it("checks every minute and refreshes at most every 10 minutes", () => {
    expect(KEEP_ALIVE_CHECK_MS).toBe(MINUTE);
    expect(KEEP_ALIVE_INTERVAL_MS).toBe(10 * MINUTE);
  });

  it("does not refresh an idle session", async () => {
    stop = startSessionKeepAlive(vi.fn());

    await vi.advanceTimersByTimeAsync(30 * MINUTE);

    expect(refreshAccessSession).not.toHaveBeenCalled();
  });

  it("refreshes once the interval has elapsed if the user was active meanwhile", async () => {
    const onExpired = vi.fn();
    stop = startSessionKeepAlive(onExpired);

    await vi.advanceTimersByTimeAsync(2 * MINUTE);
    window.dispatchEvent(new KeyboardEvent("keydown"));
    await vi.advanceTimersByTimeAsync(7 * MINUTE);
    expect(refreshAccessSession).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1 * MINUTE);
    expect(refreshAccessSession).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("ignores activity that happened before the latest refresh", async () => {
    stop = startSessionKeepAlive(vi.fn());
    window.dispatchEvent(new Event("scroll"));
    getLastSessionRefreshAt.mockReturnValue(Date.now() + 1);

    await vi.advanceTimersByTimeAsync(10 * MINUTE);

    expect(refreshAccessSession).not.toHaveBeenCalled();
  });

  it("reports an expired session", async () => {
    refreshAccessSession.mockResolvedValue("expired");
    const onExpired = vi.fn();
    stop = startSessionKeepAlive(onExpired);
    window.dispatchEvent(new Event("pointerdown"));

    await vi.advanceTimersByTimeAsync(10 * MINUTE);

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the server is unreachable and retries on the next check", async () => {
    refreshAccessSession.mockResolvedValueOnce("unavailable").mockResolvedValue("refreshed");
    const onExpired = vi.fn();
    stop = startSessionKeepAlive(onExpired);
    window.dispatchEvent(new Event("input"));

    await vi.advanceTimersByTimeAsync(11 * MINUTE);

    expect(onExpired).not.toHaveBeenCalled();
    expect(refreshAccessSession).toHaveBeenCalledTimes(2);
  });

  it("checks right away when the tab becomes visible again, never while hidden", async () => {
    stop = startSessionKeepAlive(vi.fn());
    window.dispatchEvent(new Event("touchstart"));
    vi.setSystemTime(Date.now() + 10 * MINUTE);

    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshAccessSession).not.toHaveBeenCalled();

    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshAccessSession).toHaveBeenCalledTimes(1);
  });

  it("never runs two refreshes at once", async () => {
    let release: (value: string) => void = () => {};
    refreshAccessSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    stop = startSessionKeepAlive(vi.fn());
    window.dispatchEvent(new Event("wheel"));
    vi.setSystemTime(Date.now() + 10 * MINUTE);

    setVisibility("visible");
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshAccessSession).toHaveBeenCalledTimes(1);

    release("refreshed");
    await vi.advanceTimersByTimeAsync(0);
  });

  it("stops listening once stopped", async () => {
    stop = startSessionKeepAlive(vi.fn());
    stop();
    window.dispatchEvent(new Event("pointermove"));
    setVisibility("visible");

    await vi.advanceTimersByTimeAsync(20 * MINUTE);

    expect(refreshAccessSession).not.toHaveBeenCalled();
  });
});
