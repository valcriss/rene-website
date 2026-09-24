import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildUploadUrl,
  claimLocalUploads,
  cleanupExpiredPendingUploads,
  deleteUploadIfLocal,
  deleteLocalUploads,
  deleteUnreferencedLocalUploads,
  ensureUploadDir,
  getAssetUploadDir,
  getPendingUploadDir,
  getUploadDir,
  isLocalUpload,
  isStoredUploadFilename,
  PENDING_UPLOAD_TTL_MS,
  persistProcessedUpload,
  readStoredUpload,
  releaseClaimedUploads,
  resolveUploadPath
} from "../src/uploads/storage";

const storedFilename = "123e4567-e89b-42d3-a456-426614174000.webp";

describe("uploads storage", () => {
  const originalDir = process.env.UPLOAD_DIR;

  afterEach(() => {
    process.env.UPLOAD_DIR = originalDir;
    jest.restoreAllMocks();
  });

  it("builds upload url", () => {
    expect(buildUploadUrl("file.png")).toBe("/uploads/file.png");
  });

  it("recognizes only generated WebP filenames", () => {
    expect(isStoredUploadFilename("123e4567-e89b-42d3-a456-426614174000.webp")).toBe(true);
    expect(isStoredUploadFilename("123e4567-e89b-12d3-a456-426614174000.webp")).toBe(false);
    expect(isStoredUploadFilename("file.svg")).toBe(false);
  });

  it("persists processed uploads with a generated name", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = dir;

    const filename = await persistProcessedUpload(Buffer.from("processed"));

    expect(isStoredUploadFilename(filename)).toBe(true);
    expect(fs.readFileSync(path.join(dir, "pending", filename), "utf8")).toBe("processed");
  });

  it("ensures upload dir exists", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    const target = path.join(dir, "nested");
    process.env.UPLOAD_DIR = target;

    expect(fs.existsSync(target)).toBe(false);
    ensureUploadDir();
    expect(fs.existsSync(target)).toBe(true);
  });

  it("detects local uploads", () => {
    expect(isLocalUpload("/uploads/file.png")).toBe(true);
    expect(isLocalUpload("https://example.com/file.png")).toBe(false);
  });

  it("resolves upload path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = dir;
    expect(resolveUploadPath("/uploads/file.png")).toBe(path.join(dir, "assets", "file.png"));
  });

  it("claims referenced uploads from image and rich content, then can release them", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = dir;
    const pendingPath = path.join(getPendingUploadDir(), storedFilename);
    fs.writeFileSync(pendingPath, "content");

    const claimed = await claimLocalUploads([
      null,
      `/uploads/${storedFilename}`,
      `<p><img src="/uploads/${storedFilename}"></p>`
    ]);

    expect(claimed).toEqual([storedFilename]);
    expect(fs.existsSync(path.join(getAssetUploadDir(), storedFilename))).toBe(true);
    expect(await readStoredUpload(storedFilename)).toEqual(Buffer.from("content"));

    await releaseClaimedUploads(claimed);
    expect(fs.existsSync(pendingPath)).toBe(true);
    expect(await readStoredUpload(storedFilename)).toEqual(Buffer.from("content"));
  });

  it("ignores already claimed or already released files", async () => {
    process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));

    await expect(claimLocalUploads([`/uploads/${storedFilename}`])).resolves.toEqual([]);
    await expect(releaseClaimedUploads([storedFilename])).resolves.toBeUndefined();
  });

  it("surfaces unexpected filesystem errors while claiming or releasing", async () => {
    process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    const filesystemError = Object.assign(new Error("denied"), { code: "EACCES" });
    const renameSpy = jest.spyOn(fs.promises, "rename").mockRejectedValue(filesystemError);

    await expect(claimLocalUploads([`/uploads/${storedFilename}`])).rejects.toBe(filesystemError);
    await expect(releaseClaimedUploads([storedFilename])).rejects.toBe(filesystemError);

    renameSpy.mockRestore();
  });

  it("cleans only expired pending uploads", async () => {
    process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    const pendingDir = getPendingUploadDir();
    const expired = path.join(pendingDir, storedFilename);
    const recentName = "123e4567-e89b-42d3-a456-426614174001.webp";
    const recent = path.join(pendingDir, recentName);
    fs.writeFileSync(expired, "expired");
    fs.writeFileSync(recent, "recent");
    fs.writeFileSync(path.join(pendingDir, "ignored.txt"), "ignored");
    fs.mkdirSync(path.join(pendingDir, "directory.webp"));
    const now = Date.now();
    fs.utimesSync(expired, new Date(now - PENDING_UPLOAD_TTL_MS - 1), new Date(now - PENDING_UPLOAD_TTL_MS - 1));

    await cleanupExpiredPendingUploads(now);

    expect(fs.existsSync(expired)).toBe(false);
    expect(fs.existsSync(recent)).toBe(true);
    expect(fs.existsSync(path.join(pendingDir, "ignored.txt"))).toBe(true);
  });

  it("deletes local file when present", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = dir;
    const assetPath = path.join(getAssetUploadDir(), "file.png");
    const pendingPath = path.join(getPendingUploadDir(), "file.png");
    fs.writeFileSync(assetPath, "content");
    fs.writeFileSync(pendingPath, "content");

    await deleteUploadIfLocal("/uploads/file.png");

    expect(fs.existsSync(assetPath)).toBe(false);
    expect(fs.existsSync(pendingPath)).toBe(false);
  });

  it("deletes local assets that are no longer referenced", async () => {
    process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    const keptName = "123e4567-e89b-42d3-a456-426614174001.webp";
    const removedPath = path.join(getAssetUploadDir(), storedFilename);
    const keptPath = path.join(getAssetUploadDir(), keptName);
    fs.writeFileSync(removedPath, "removed");
    fs.writeFileSync(keptPath, "kept");

    await deleteUnreferencedLocalUploads(
      [`/uploads/${storedFilename}`, `<img src="/uploads/${keptName}">`],
      [`/uploads/${keptName}`]
    );

    expect(fs.existsSync(removedPath)).toBe(false);
    expect(fs.existsSync(keptPath)).toBe(true);
    await deleteLocalUploads([`/uploads/${keptName}`]);
    expect(fs.existsSync(keptPath)).toBe(false);
  });

  it("ignores non-local delete", async () => {
    await expect(deleteUploadIfLocal(null)).resolves.toBeUndefined();
    await expect(deleteUploadIfLocal("https://example.com/file.png")).resolves.toBeUndefined();
  });

  it("returns default upload dir when not set", () => {
    delete process.env.UPLOAD_DIR;
    const dir = getUploadDir();
    expect(dir.length).toBeGreaterThan(0);
  });
});
