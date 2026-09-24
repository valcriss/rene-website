import { vi } from "vitest";
import { getSession, login, logout, requestPasswordReset, resetPassword, signup } from "../src/api/auth";

describe("auth api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs in", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { id: "1", name: "U", email: "u@test", role: "EDITOR" } })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login("u@test", "secret");

    expect(result.user.email).toBe("u@test");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("throws with API errors", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: ["Nope"] }) })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(login("u@test", "secret")).rejects.toThrow("Nope");
  });

  it("throws with API message", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Erreur" }) })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(login("u@test", "secret")).rejects.toThrow("Erreur");
  });

  it("throws with fallback message when parsing fails", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.reject("boom") }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(login("u@test", "secret")).rejects.toThrow("Connexion impossible");
  });

  it("signs up", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "t", user: { id: "1", name: "U", email: "u@test", role: "EDITOR" } })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await signup({
      name: "U",
      email: "u@test",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(result.user.email).toBe("u@test");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", expect.any(Object));
  });

  it("throws signup fallback when parsing fails", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.reject("boom") }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      signup({
        name: "U",
        email: "u@test",
        password: "secret123",
        passwordConfirmation: "secret123"
      })
    ).rejects.toThrow("Inscription impossible");
  });

  it("requests a password reset", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    vi.stubGlobal("fetch", fetchMock);

    await requestPasswordReset("u@test");

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/forgot-password", expect.any(Object));
  });

  it("resets a password", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    vi.stubGlobal("fetch", fetchMock);

    await resetPassword({
      token: "token",
      password: "secret123",
      passwordConfirmation: "secret123"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/reset-password", expect.any(Object));
  });

  it("restores an active session", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: { id: "1", name: "U", email: "u@test", role: "EDITOR" } })
    })));
    await expect(getSession()).resolves.toMatchObject({ user: { email: "u@test" } });
  });

  it("rotates the refresh token before retrying an expired access session", async () => {
    document.cookie = "rene_csrf=csrf%20token; Path=/";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1", name: "U", email: "u@test", role: "EDITOR" } })
      });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getSession()).resolves.toMatchObject({ user: { id: "1" } });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/refresh", expect.objectContaining({
      method: "POST",
      headers: { "X-CSRF-Token": "csrf token" }
    }));
  });

  it("returns no session when refresh or session validation fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 401 }));
    await expect(getSession()).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));
    await expect(getSession()).resolves.toBeNull();
  });

  it("logs out with same-origin credentials and CSRF", async () => {
    document.cookie = "rene_csrf=logout-token; Path=/";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await logout();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": "logout-token" }
    });
  });
});
