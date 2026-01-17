"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const static_1 = require("../src/static");
const frontendDist = node_path_1.default.resolve(__dirname, "../../frontend/dist");
describe("registerStatic", () => {
    beforeAll(async () => {
        await node_fs_1.promises.mkdir(frontendDist, { recursive: true });
        await node_fs_1.promises.writeFile(node_path_1.default.join(frontendDist, "index.html"), "<h1>Index</h1>");
        await node_fs_1.promises.writeFile(node_path_1.default.join(frontendDist, "hello.txt"), "hello");
    });
    afterAll(async () => {
        await node_fs_1.promises.rm(frontendDist, { recursive: true, force: true });
    });
    it("serves static assets", async () => {
        const app = (0, express_1.default)();
        (0, static_1.registerStatic)(app);
        const response = await (0, supertest_1.default)(app).get("/hello.txt");
        expect(response.status).toBe(200);
        expect(response.text).toBe("hello");
    });
    it("serves index.html for unmatched routes", async () => {
        const app = (0, express_1.default)();
        (0, static_1.registerStatic)(app);
        const response = await (0, supertest_1.default)(app).get("/some/route");
        expect(response.status).toBe(200);
        expect(response.text).toBe("<h1>Index</h1>");
    });
});
