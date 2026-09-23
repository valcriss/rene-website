import { vi } from "vitest";
import { sendContactMessage } from "../src/api/contact";

describe("contact api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a contact message", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ message: "ok" }) }));
    vi.stubGlobal("fetch", fetchMock);

    await sendContactMessage({ name: "Marie", email: "marie@test.fr", message: "Bonjour" });

    expect(fetchMock).toHaveBeenCalledWith("/api/contact", expect.any(Object));
  });

  it("throws with API errors", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: ["Nope"] }) })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendContactMessage({ name: "Marie", email: "marie@test.fr", message: "Bonjour" })
    ).rejects.toThrow("Nope");
  });

  it("throws with API message", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Erreur" }) })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendContactMessage({ name: "Marie", email: "marie@test.fr", message: "Bonjour" })
    ).rejects.toThrow("Erreur");
  });

  it("throws with fallback message when parsing fails", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.reject("boom") }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendContactMessage({ name: "Marie", email: "marie@test.fr", message: "Bonjour" })
    ).rejects.toThrow("Envoi du message impossible");
  });
});
