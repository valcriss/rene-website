import { requireRole } from "../src/auth/roles";
import { Request, Response, NextFunction } from "express";

describe("requireRole", () => {
  const createRes = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;
    return res;
  };

  const createReq = (role?: "EDITOR" | "MODERATOR" | "ADMIN") => ({
    headers: {},
    user: role ? { id: "user-1", name: "User", email: "user@example.com", role } : undefined
  }) as Request;

  it("returns 401 when missing role", () => {
    const res = createRes();
    const next = jest.fn() as NextFunction;

    requireRole(["EDITOR"])(createReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("ignores a spoofed role header", () => {
    const res = createRes();
    const next = jest.fn() as NextFunction;
    const req = createReq();
    req.headers["x-user-role"] = "ADMIN";

    requireRole(["EDITOR"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role not allowed", () => {
    const res = createRes();
    const next = jest.fn() as NextFunction;

    requireRole(["MODERATOR"])(createReq("EDITOR"), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when role is allowed", () => {
    const res = createRes();
    const next = jest.fn() as NextFunction;

    requireRole(["EDITOR", "ADMIN"])(createReq("ADMIN"), res, next);

    expect(next).toHaveBeenCalled();
  });
});
