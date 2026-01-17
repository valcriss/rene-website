import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildUploadUrl,
  deleteUploadIfLocal,
  ensureUploadDir,
  getUploadDir,
  isLocalUpload,
  resolveUploadPath
} from "../src/uploads/storage";

describe("uploads storage", () => {
  const originalDir = process.env.UPLOAD_DIR;

  afterEach(() => {
    process.env.UPLOAD_DIR = originalDir;
  });

  it("builds upload url", () => {
    expect(buildUploadUrl("file.png")).toBe("/uploads/file.png");
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
    expect(resolveUploadPath("/uploads/file.png")).toBe(path.join(dir, "file.png"));
  });

  it("deletes local file when present", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = dir;
    const filePath = path.join(dir, "file.png");
    fs.writeFileSync(filePath, "content");

    await deleteUploadIfLocal("/uploads/file.png");

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("ignores non-local delete", async () => {
    await expect(deleteUploadIfLocal("https://example.com/file.png")).resolves.toBeUndefined();
  });

  it("returns default upload dir when not set", () => {
    delete process.env.UPLOAD_DIR;
    const dir = getUploadDir();
    expect(dir.length).toBeGreaterThan(0);
  });
});
