"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const storage_1 = require("../src/uploads/storage");
describe("uploads storage", () => {
    const originalDir = process.env.UPLOAD_DIR;
    afterEach(() => {
        process.env.UPLOAD_DIR = originalDir;
    });
    it("builds upload url", () => {
        expect((0, storage_1.buildUploadUrl)("file.png")).toBe("/uploads/file.png");
    });
    it("ensures upload dir exists", () => {
        const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "uploads-"));
        const target = node_path_1.default.join(dir, "nested");
        process.env.UPLOAD_DIR = target;
        expect(node_fs_1.default.existsSync(target)).toBe(false);
        (0, storage_1.ensureUploadDir)();
        expect(node_fs_1.default.existsSync(target)).toBe(true);
    });
    it("detects local uploads", () => {
        expect((0, storage_1.isLocalUpload)("/uploads/file.png")).toBe(true);
        expect((0, storage_1.isLocalUpload)("https://example.com/file.png")).toBe(false);
    });
    it("resolves upload path", () => {
        const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "uploads-"));
        process.env.UPLOAD_DIR = dir;
        expect((0, storage_1.resolveUploadPath)("/uploads/file.png")).toBe(node_path_1.default.join(dir, "file.png"));
    });
    it("deletes local file when present", async () => {
        const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "uploads-"));
        process.env.UPLOAD_DIR = dir;
        const filePath = node_path_1.default.join(dir, "file.png");
        node_fs_1.default.writeFileSync(filePath, "content");
        await (0, storage_1.deleteUploadIfLocal)("/uploads/file.png");
        expect(node_fs_1.default.existsSync(filePath)).toBe(false);
    });
    it("ignores non-local delete", async () => {
        await expect((0, storage_1.deleteUploadIfLocal)("https://example.com/file.png")).resolves.toBeUndefined();
    });
    it("returns default upload dir when not set", () => {
        delete process.env.UPLOAD_DIR;
        const dir = (0, storage_1.getUploadDir)();
        expect(dir.length).toBeGreaterThan(0);
    });
});
