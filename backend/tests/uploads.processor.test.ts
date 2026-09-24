import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  getDeclaredUploadFormat,
  isDecodedMetadataAllowed,
  processAndPersistUpload,
  UploadRejectedError
} from "../src/uploads/processor";

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "uploads-processor-"));
const sourceImage = () => sharp({
  create: {
    width: 3,
    height: 2,
    channels: 4,
    background: { r: 120, g: 80, b: 40, alpha: 1 }
  }
});

describe("upload processor", () => {
  const originalDir = process.env.UPLOAD_DIR;

  afterEach(() => {
    process.env.UPLOAD_DIR = originalDir;
  });

  it.each([
    ["photo.jpg", "image/jpeg", "jpeg"],
    ["photo.JPEG", "IMAGE/JPEG", "jpeg"],
    ["photo.png", "image/png", "png"],
    ["photo.webp", "image/webp", "webp"]
  ] as const)("accepts the declared format for %s", (filename, mime, expected) => {
    expect(getDeclaredUploadFormat(filename, mime)).toBe(expected);
  });

  it.each([
    ["photo.svg", "image/svg+xml"],
    ["photo.svg.png", "image/png"],
    ["../photo.png", "image/png"],
    ["photo.png", "image/jpeg"],
    ["photo.bmp", "image/bmp"]
  ])("rejects the declaration for %s", (filename, mime) => {
    expect(getDeclaredUploadFormat(filename, mime)).toBeNull();
  });

  it("validates decoded format and rejects multi-page images", () => {
    expect(isDecodedMetadataAllowed({ format: "png" }, "png")).toBe(true);
    expect(isDecodedMetadataAllowed({ format: "jpeg", pages: 1 }, "png")).toBe(false);
    expect(isDecodedMetadataAllowed({ format: "webp", pages: 2 }, "webp")).toBe(false);
  });

  it.each([
    ["jpeg", "photo.jpg", "image/jpeg"],
    ["png", "photo.png", "image/png"],
    ["webp", "photo.webp", "image/webp"]
  ] as const)("decodes %s and persists a metadata-free WebP", async (format, originalname, mimetype) => {
    const dir = createTempDir();
    process.env.UPLOAD_DIR = dir;
    const pipeline = sourceImage().withMetadata({
      exif: { IFD0: { Copyright: "metadata to remove" } }
    });
    const buffer = await pipeline.toFormat(format).toBuffer();

    const filename = await processAndPersistUpload({ buffer, originalname, mimetype });
    const metadata = await sharp(path.join(dir, "pending", filename)).metadata();

    expect(filename).toMatch(/\.webp$/);
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it.each([
    ["bad.png", "image/png", Buffer.from("not-png")],
    ["bad.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xff, 0xd9])],
    ["bad.webp", "image/webp", Buffer.from("RIFF\u0004\u0000\u0000\u0000WEBP")]
  ])("rejects malformed binary content for %s", async (originalname, mimetype, buffer) => {
    process.env.UPLOAD_DIR = createTempDir();

    await expect(processAndPersistUpload({ buffer, originalname, mimetype })).rejects.toBeInstanceOf(UploadRejectedError);
    expect(fs.readdirSync(process.env.UPLOAD_DIR)).toEqual([]);
  });

  it("rejects a valid image with trailing polyglot content", async () => {
    process.env.UPLOAD_DIR = createTempDir();
    const png = await sourceImage().png().toBuffer();
    const polyglot = Buffer.concat([png, Buffer.from("<script>alert(1)</script>")]);

    await expect(processAndPersistUpload({
      buffer: polyglot,
      originalname: "polyglot.png",
      mimetype: "image/png"
    })).rejects.toBeInstanceOf(UploadRejectedError);
  });

  it("rejects a decoded multi-page image before persistence", async () => {
    process.env.UPLOAD_DIR = createTempDir();
    const webp = await sourceImage().webp().toBuffer();
    const createImage = (() => ({
      metadata: async () => ({ format: "webp", pages: 2 })
    })) as unknown as Parameters<typeof processAndPersistUpload>[1];

    await expect(processAndPersistUpload({
      buffer: webp,
      originalname: "animated.webp",
      mimetype: "image/webp"
    }, createImage)).rejects.toBeInstanceOf(UploadRejectedError);
    expect(fs.readdirSync(process.env.UPLOAD_DIR)).toEqual([]);
  });
});
