"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../src/auth/jwt");
describe("auth jwt", () => {
    const user = {
        id: "user-1",
        name: "Test",
        email: "test@example.com",
        role: "EDITOR"
    };
    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
    });
    it("signs and verifies token", () => {
        const tokenResult = (0, jwt_1.signUserToken)(user);
        expect(tokenResult.ok).toBe(true);
        if (!tokenResult.ok)
            return;
        const verifyResult = (0, jwt_1.verifyUserToken)(tokenResult.value);
        expect(verifyResult.ok).toBe(true);
        if (!verifyResult.ok)
            return;
        expect(verifyResult.value).toEqual(user);
    });
    it("signs token with custom expiration", () => {
        process.env.JWT_EXPIRES_IN = "1h";
        const tokenResult = (0, jwt_1.signUserToken)(user);
        expect(tokenResult.ok).toBe(true);
    });
    it("returns error on invalid token", () => {
        const verifyResult = (0, jwt_1.verifyUserToken)("invalid.token.value");
        expect(verifyResult.ok).toBe(false);
    });
    it("returns error when secret is missing", () => {
        delete process.env.JWT_SECRET;
        const signResult = (0, jwt_1.signUserToken)(user);
        expect(signResult.ok).toBe(false);
        const verifyResult = (0, jwt_1.verifyUserToken)("token");
        expect(verifyResult.ok).toBe(false);
    });
    it("rejects token with missing claims", () => {
        const token = jsonwebtoken_1.default.sign({ sub: "user-1" }, process.env.JWT_SECRET);
        const verifyResult = (0, jwt_1.verifyUserToken)(token);
        expect(verifyResult.ok).toBe(false);
    });
    it("rejects token with string payload", () => {
        const token = jsonwebtoken_1.default.sign("payload", process.env.JWT_SECRET);
        const verifyResult = (0, jwt_1.verifyUserToken)(token);
        expect(verifyResult.ok).toBe(false);
    });
    it("rejects token with invalid role type", () => {
        const token = jsonwebtoken_1.default.sign({ sub: "user-1", email: "test@example.com", name: "Test", role: 123 }, process.env.JWT_SECRET);
        const verifyResult = (0, jwt_1.verifyUserToken)(token);
        expect(verifyResult.ok).toBe(false);
    });
    it("rejects token with empty payload", () => {
        const token = jsonwebtoken_1.default.sign({}, process.env.JWT_SECRET);
        const verifyResult = (0, jwt_1.verifyUserToken)(token);
        expect(verifyResult.ok).toBe(false);
    });
});
