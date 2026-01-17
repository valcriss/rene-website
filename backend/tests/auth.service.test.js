"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../src/auth/service");
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
describe("auth service", () => {
    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
    });
    it("returns validation errors", async () => {
        const repo = buildRepo((0, password_1.hashPassword)("secret"));
        const result = await (0, service_1.login)(repo, {});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain("L'email est requis.");
            expect(result.errors).toContain("Le mot de passe est requis.");
        }
    });
    it("returns error when payload is not an object", async () => {
        const repo = buildRepo((0, password_1.hashPassword)("secret"));
        const result = await (0, service_1.login)(repo, null);
        expect(result.ok).toBe(false);
    });
    it("returns invalid credentials", async () => {
        const repo = buildRepo((0, password_1.hashPassword)("secret"));
        const result = await (0, service_1.login)(repo, { email: "test@example.com", password: "wrong" });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain("Identifiants invalides.");
        }
    });
    it("logs in with token", async () => {
        const repo = buildRepo((0, password_1.hashPassword)("secret"));
        const result = await (0, service_1.login)(repo, { email: "test@example.com", password: "secret" });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.value.token).toBeDefined();
        expect(result.value.user.email).toBe("test@example.com");
    });
    it("returns error when JWT secret is missing", async () => {
        delete process.env.JWT_SECRET;
        const repo = buildRepo((0, password_1.hashPassword)("secret"));
        const result = await (0, service_1.login)(repo, { email: "test@example.com", password: "secret" });
        expect(result.ok).toBe(false);
    });
});
