import { vi } from "vitest";
import { login } from "../src/api/auth";

describe("auth api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs in", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "t", user: { id: "1", name: "U", email: "u@test", role: "EDITOR" } })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login("u@test", "secret");

    expect(result.token).toBe("t");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.any(Object));
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
});
