"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const middleware_1 = require("../src/auth/middleware");
const jwt_1 = require("../src/auth/jwt");
describe("auth middleware", () => {
    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
    });
    it("allows unauthenticated requests", async () => {
        const app = (0, express_1.default)();
        app.use(middleware_1.authenticateOptional);
        app.get("/me", (req, res) => {
            res.json({ user: req.user ?? null });
        });
        const response = await (0, supertest_1.default)(app).get("/me");
        expect(response.status).toBe(200);
        expect(response.body.user).toBeNull();
    });
    it("attaches user when token is valid", async () => {
        const tokenResult = (0, jwt_1.signUserToken)({
            id: "user-1",
            name: "Test",
            email: "test@example.com",
            role: "EDITOR"
        });
        if (!tokenResult.ok)
            throw new Error("Token generation failed");
        const app = (0, express_1.default)();
        app.use(middleware_1.authenticateOptional);
        app.get("/me", (req, res) => {
            res.json({ user: req.user ?? null });
        });
        const response = await (0, supertest_1.default)(app)
            .get("/me")
            .set("Authorization", `Bearer ${tokenResult.value}`);
        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe("test@example.com");
    });
    it("rejects invalid token", async () => {
        const app = (0, express_1.default)();
        app.use(middleware_1.authenticateOptional);
        app.get("/me", (_req, res) => {
            res.json({ ok: true });
        });
        const response = await (0, supertest_1.default)(app)
            .get("/me")
            .set("Authorization", "Bearer invalid");
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication required" });
    });
    it("rejects invalid authorization scheme", async () => {
        const app = (0, express_1.default)();
        app.use(middleware_1.authenticateOptional);
        app.get("/me", (_req, res) => {
            res.json({ ok: true });
        });
        const response = await (0, supertest_1.default)(app)
            .get("/me")
            .set("Authorization", "Token abc");
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication required" });
    });
});
