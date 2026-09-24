import { Request, Response, NextFunction } from "express";

export type UserRole = "EDITOR" | "MODERATOR" | "ADMIN";

export const isUserRole = (value: unknown): value is UserRole => {
  if (value === "EDITOR" || value === "MODERATOR" || value === "ADMIN") {
    return true;
  }
  return false;
};

export const requireRole = (allowed: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;

    if (!role) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!allowed.includes(role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};
