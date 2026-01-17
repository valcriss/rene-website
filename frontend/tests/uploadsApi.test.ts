import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "../src/api/uploads";

describe("uploads api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ url: "/uploads/test.png" }) }))
    );

    const file = new File(["image"], "photo.png", { type: "image/png" });
    await expect(uploadImage(file)).resolves.toBe("/uploads/test.png");
  });

  it("surfaces API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: ["Format d'image invalide."] }) })
      )
    );

    const file = new File(["image"], "photo.png", { type: "image/png" });
    await expect(uploadImage(file)).rejects.toThrow("Format d'image invalide.");
  });

  it("falls back to default message when response is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.reject(new Error("boom")) }))
    );

    const file = new File(["image"], "photo.png", { type: "image/png" });
    await expect(uploadImage(file)).rejects.toThrow("Impossible d'uploader l'image");
  });

  it("surfaces message errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Upload refusé" }) }))
    );

    const file = new File(["image"], "photo.png", { type: "image/png" });
    await expect(uploadImage(file)).rejects.toThrow("Upload refusé");
  });
});
