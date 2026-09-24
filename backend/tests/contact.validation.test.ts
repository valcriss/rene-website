import { validateContactMessage } from "../src/contact/validation";
import { resolveClientKey } from "../src/security/rateLimiter";

describe("validateContactMessage", () => {
  it("accepts a valid message", () => {
    const result = validateContactMessage({
      name: "Marie",
      email: "marie@test.fr",
      message: "Bonjour, une question."
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: "Marie",
        email: "marie@test.fr",
        message: "Bonjour, une question.",
        honeypot: ""
      });
    }
  });

  it("trims fields and keeps the honeypot value when present", () => {
    const result = validateContactMessage({
      name: "  Marie  ",
      email: "  marie@test.fr  ",
      message: "  Bonjour  ",
      website: "https://spam.example.com"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: "Marie",
        email: "marie@test.fr",
        message: "Bonjour",
        honeypot: "https://spam.example.com"
      });
    }
  });

  it("rejects a non-object body", () => {
    const result = validateContactMessage("nope");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le corps de la requête doit être un objet.");
    }
  });

  it("rejects null", () => {
    const result = validateContactMessage(null);

    expect(result.ok).toBe(false);
  });

  it("requires name, email and message", () => {
    const result = validateContactMessage({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le nom est requis.");
      expect(result.errors).toContain("L'email est requis.");
      expect(result.errors).toContain("Le message est requis.");
    }
  });

  it("rejects an invalid email", () => {
    const result = validateContactMessage({ name: "Marie", email: "not-an-email", message: "Bonjour" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("L'email est invalide.");
    }
  });

  it("rejects a name that is too long", () => {
    const result = validateContactMessage({
      name: "a".repeat(121),
      email: "marie@test.fr",
      message: "Bonjour"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le nom ne peut pas dépasser 120 caractères.");
    }
  });

  it("rejects a message that is too long", () => {
    const result = validateContactMessage({
      name: "Marie",
      email: "marie@test.fr",
      message: "a".repeat(4001)
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Le message ne peut pas dépasser 4000 caractères.");
    }
  });
});

describe("resolveClientKey", () => {
  it("returns the request IP when present", () => {
    expect(resolveClientKey({ ip: "1.2.3.4" })).toBe("1.2.3.4");
  });

  it("falls back to \"unknown\" when the request has no IP", () => {
    expect(resolveClientKey({ ip: undefined })).toBe("unknown");
  });
});
