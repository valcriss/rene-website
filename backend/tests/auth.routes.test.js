"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const routes_1 = require("../src/auth/routes");
const password_1 = require("../src/auth/password");
const buildRepo = (passwordHash) => ({
    getUserByEmail: async () => passwordHash
        ? {
            id: "user-1",
            name: "Test",
            email: "test@example.com",
            role: "EDITOR",
            passwordHash
        }
        : null,
    getUserById: async () => null,
    listUsersByRole: async () => []
});
describe("auth routes", () => {
    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
    });
    it("returns 400 on invalid payload", async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createAuthRouter)(buildRepo((0, password_1.hashPassword)("secret"))));
        const response = await (0, supertest_1.default)(app).post("/api/auth/login").send({});
        expect(response.status).toBe(400);
        expect(response.body.errors).toContain("L'email est requis.");
    });
    it("returns 401 on invalid credentials", async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createAuthRouter)(buildRepo((0, password_1.hashPassword)("secret"))));
        const response = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .send({ email: "test@example.com", password: "wrong" });
        expect(response.status).toBe(401);
    });
    it("returns token on success", async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createAuthRouter)(buildRepo((0, password_1.hashPassword)("secret"))));
        const response = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .send({ email: "test@example.com", password: "secret" });
        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe("test@example.com");
    });
});
