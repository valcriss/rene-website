"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roles_1 = require("../src/auth/roles");
describe("requireRole", () => {
    const createRes = () => {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        return res;
    };
    const createReq = (role) => ({
        header: jest.fn(() => role)
    });
    it("returns 401 when missing role", () => {
        const res = createRes();
        const next = jest.fn();
        (0, roles_1.requireRole)(["EDITOR"])(createReq(), res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
        expect(next).not.toHaveBeenCalled();
    });
    it("returns 401 when role is invalid", () => {
        const res = createRes();
        const next = jest.fn();
        (0, roles_1.requireRole)(["EDITOR"])(createReq("INVALID"), res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
        expect(next).not.toHaveBeenCalled();
    });
    it("returns 403 when role not allowed", () => {
        const res = createRes();
        const next = jest.fn();
        (0, roles_1.requireRole)(["MODERATOR"])(createReq("EDITOR"), res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
        expect(next).not.toHaveBeenCalled();
    });
    it("calls next when role is allowed", () => {
        const res = createRes();
        const next = jest.fn();
        (0, roles_1.requireRole)(["EDITOR", "ADMIN"])(createReq("ADMIN"), res, next);
        expect(next).toHaveBeenCalled();
    });
});
