"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const routes_1 = require("../src/uploads/routes");
const createTempDir = () => node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "uploads-"));
describe("uploads routes", () => {
    const originalDir = process.env.UPLOAD_DIR;
    afterEach(() => {
        process.env.UPLOAD_DIR = originalDir;
    });
    it("uploads an image", async () => {
        const dir = createTempDir();
        process.env.UPLOAD_DIR = dir;
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createUploadRouter)());
        const response = await (0, supertest_1.default)(app)
            .post("/api/uploads")
            .attach("image", Buffer.from("image"), {
            filename: "photo.png",
            contentType: "image/png"
        });
        expect(response.status).toBe(201);
        expect(response.body.url).toMatch(/^\/uploads\//);
        const files = node_fs_1.default.readdirSync(dir);
        expect(files.length).toBe(1);
    });
    it("returns 400 for missing file", async () => {
        const dir = createTempDir();
        process.env.UPLOAD_DIR = dir;
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createUploadRouter)());
        const response = await (0, supertest_1.default)(app).post("/api/uploads");
        expect(response.status).toBe(400);
        expect(response.body.errors).toContain("Une image est requise.");
    });
    it("returns 400 for invalid file type", async () => {
        const dir = createTempDir();
        process.env.UPLOAD_DIR = dir;
        const app = (0, express_1.default)();
        app.use("/api", (0, routes_1.createUploadRouter)());
        const response = await (0, supertest_1.default)(app)
            .post("/api/uploads")
            .attach("image", Buffer.from("text"), {
            filename: "note.txt",
            contentType: "text/plain"
        });
        expect(response.status).toBe(400);
        expect(response.body.errors).toContain("Format d'image invalide.");
    });
});
