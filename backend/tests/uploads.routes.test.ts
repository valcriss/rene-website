import express from "express";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { authenticateOptional } from "../src/auth/middleware";
import {
  createUploadedAssetRouter,
  createUploadRouter,
  resetUploadRateLimitsForTests
} from "../src/uploads/routes";
import { MAX_UPLOAD_BYTES } from "../src/uploads/processor";
import { authHeader } from "./authTestUtils";

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
const createApp = () => {
  const app = express();
  app.use(authenticateOptional);
  app.use("/api", createUploadRouter());
  app.use("/uploads", createUploadedAssetRouter());
  return app;
};

const createPng = () => sharp({
  create: {
    width: 2,
    height: 2,
    channels: 4,
    background: { r: 30, g: 60, b: 90, alpha: 1 }
  }
}).png().toBuffer();

describe("uploads routes", () => {
  const originalDir = process.env.UPLOAD_DIR;

  beforeEach(() => {
    resetUploadRateLimitsForTests();
  });

  afterEach(() => {
    process.env.UPLOAD_DIR = originalDir;
    jest.restoreAllMocks();
  });

  it("rejects anonymous uploads before creating the storage directory", async () => {
    const parent = createTempDir();
    const dir = path.join(parent, "not-created");
    process.env.UPLOAD_DIR = dir;

    const response = await request(createApp())
      .post("/api/uploads")
      .attach("image", await createPng(), { filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(401);
    expect(fs.existsSync(dir)).toBe(false);
  });

  it("re-encodes an authenticated raster image and serves it with hardened headers", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const app = createApp();

    const response = await request(app)
      .post("/api/uploads")
      .set("Authorization", authHeader("EDITOR"))
      .attach("image", await createPng(), { filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
    const files = fs.readdirSync(path.join(dir, "pending"));
    expect(files).toEqual([path.basename(response.body.url)]);
    await expect(sharp(path.join(dir, "pending", files[0])).metadata()).resolves.toMatchObject({ format: "webp" });

    const assetResponse = await request(app).get(response.body.url);
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers["content-type"]).toMatch(/^image\/webp/);
    expect(assetResponse.headers["x-content-type-options"]).toBe("nosniff");
    expect(assetResponse.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
    expect(assetResponse.headers["cross-origin-resource-policy"]).toBe("same-site");
    expect(assetResponse.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("returns 400 for a missing file", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", authHeader("EDITOR"));

    expect(response.status).toBe(400);
    expect(response.body.errors).toContain("Une image est requise.");
    expect(warnSpy).toHaveBeenCalledWith("Upload rejected", expect.objectContaining({ reason: "missing_file" }));
  });

  it.each([
    ["vector.svg", "image/svg+xml", Buffer.from("<svg><script>alert(1)</script></svg>")],
    ["photo.jpg", "image/jpeg", Buffer.from("not a jpeg")],
    ["photo.jpg", "image/jpeg", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("payload"), Buffer.from([0xff, 0xd9]), Buffer.from("<html>")])],
    ["photo.svg.png", "image/png", Buffer.from("not a png")],
    ["photo.jpg", "image/jpeg", Buffer.alloc(MAX_UPLOAD_BYTES + 1)]
  ])("rejects unsafe upload %s without leaving an orphan", async (filename, contentType, contents) => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", authHeader("EDITOR"))
      .attach("image", contents, { filename, contentType });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ errors: ["Image refusée."] });
    expect(fs.readdirSync(dir)).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain(dir);
  });

  it("rejects a MIME mismatch and multiple files", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const png = await createPng();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const mismatch = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", authHeader("MODERATOR"))
      .attach("image", png, { filename: "photo.jpg", contentType: "image/jpeg" });
    const multiple = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", authHeader("ADMIN"))
      .attach("image", png, { filename: "one.png", contentType: "image/png" })
      .attach("image", png, { filename: "two.png", contentType: "image/png" });

    expect(mismatch.status).toBe(400);
    expect(multiple.status).toBe(400);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("limits upload attempts per authenticated actor", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const app = createApp();
    const authorization = authHeader("EDITOR", "rate-limited-editor");
    jest.spyOn(console, "warn").mockImplementation(() => undefined);

    for (let index = 0; index < 20; index += 1) {
      const response = await request(app).post("/api/uploads").set("Authorization", authorization);
      expect(response.status).toBe(400);
    }
    const limited = await request(app).post("/api/uploads").set("Authorization", authorization);

    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    expect(limited.body).toEqual({ message: "Trop de requêtes." });
  });

  it("returns 404 for invalid or missing stored image names", async () => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const app = createApp();

    const invalid = await request(app).get("/uploads/file.svg");
    const missing = await request(app).get("/uploads/123e4567-e89b-42d3-a456-426614174000.webp");

    expect(invalid.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("returns a generic 500 when stored image reading fails unexpectedly", async () => {
    process.env.UPLOAD_DIR = createTempDir();
    jest.spyOn(fs.promises, "readFile").mockRejectedValue(Object.assign(new Error("private path"), { code: "EACCES" }));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(createApp()).get("/uploads/123e4567-e89b-42d3-a456-426614174000.webp");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    expect(JSON.stringify(response.body)).not.toContain("private path");
    expect(errorSpy).toHaveBeenCalled();
  });
});
