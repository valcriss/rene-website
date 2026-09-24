import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthHeaders, handleSessionExpired, setSessionExpiredHandler } from "../src/api/authHeaders";

describe("authHeaders", () => {
  afterEach(() => {
    window.localStorage.clear();
    setSessionExpiredHandler(() => {});
  });

  it("builds headers exclusively from the stored token", () => {
    window.localStorage.setItem("rene-auth-token", "token-1");
    window.localStorage.setItem("rene-auth-user-id", "user-1");

    const headers = buildAuthHeaders("ADMIN");

    expect(headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer token-1"
    });
  });

  it("omits optional headers when nothing is stored or provided", () => {
    const headers = buildAuthHeaders();

    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("skips the Content-Type header when asked to", () => {
    const headers = buildAuthHeaders("EDITOR", false);

    expect(headers).toEqual({});
  });

  it("invokes the registered handler and never settles", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);

    const pending = handleSessionExpired<string>();
    let settled = false;
    pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledOnce();
    expect(settled).toBe(false);
  });

  it("does nothing when no handler was registered", async () => {
    vi.resetModules();
    const sessionExpiredModule = await import("../src/api/authHeaders");

    const pending = sessionExpiredModule.handleSessionExpired<string>();
    let settled = false;
    pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(settled).toBe(false);
  });
});
