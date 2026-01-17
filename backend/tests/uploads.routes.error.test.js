"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const buildApp = async () => {
    const { createUploadRouter } = await Promise.resolve().then(() => __importStar(require("../src/uploads/routes")));
    const app = (0, express_1.default)();
    app.use("/api", createUploadRouter());
    return app;
};
describe("uploads routes errors", () => {
    afterEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });
    it("returns 500 when multer throws", async () => {
        jest.doMock("multer", () => {
            const multerMock = () => ({
                single: () => (_req, _res, cb) => cb(new Error("boom"))
            });
            multerMock.diskStorage = () => ({});
            return { __esModule: true, default: multerMock };
        });
        const app = await buildApp();
        const response = await (0, supertest_1.default)(app).post("/api/uploads");
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    });
    it("returns 500 when handler throws", async () => {
        jest.doMock("multer", () => {
            const multerMock = () => ({
                single: () => (req, _res, cb) => {
                    if (typeof req === "object" && req !== null) {
                        req.file = {
                            filename: "file.png",
                            originalname: "file.png",
                            mimetype: "image/png"
                        };
                    }
                    cb();
                }
            });
            multerMock.diskStorage = () => ({});
            return { __esModule: true, default: multerMock };
        });
        jest.doMock("../src/uploads/storage", () => ({
            ensureUploadDir: () => "tmp",
            buildUploadUrl: () => {
                throw new Error("boom");
            }
        }));
        const app = await buildApp();
        const response = await (0, supertest_1.default)(app).post("/api/uploads");
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: "Erreur interne du serveur." });
    });
});
