import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { useContactStore } from "../src/stores/contact";

describe("contact store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits the message and clears the form on success", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ message: "ok" }) }));
    vi.stubGlobal("fetch", fetchMock);

    const store = useContactStore();
    store.contactName = "Marie";
    store.contactEmail = "marie@test.fr";
    store.contactMessage = "Bonjour";

    await store.submitContactMessage();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({
        body: JSON.stringify({ name: "Marie", email: "marie@test.fr", message: "Bonjour", website: "" })
      })
    );
    expect(store.contactSent).toBe(true);
    expect(store.contactName).toBe("");
    expect(store.contactEmail).toBe("");
    expect(store.contactMessage).toBe("");
  });

  it("propagates errors without clearing the form", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Erreur" }) })));

    const store = useContactStore();
    store.contactName = "Marie";

    await expect(store.submitContactMessage()).rejects.toThrow("Erreur");
    expect(store.contactSent).toBe(false);
    expect(store.contactName).toBe("Marie");
  });
});
