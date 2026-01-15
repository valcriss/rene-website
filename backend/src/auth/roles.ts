import { Request, Response, NextFunction } from "express";

export type UserRole = "EDITOR" | "MODERATOR" | "ADMIN";

const parseRole = (value: string | undefined): UserRole | null => {
  if (value === "EDITOR" || value === "MODERATOR" || value === "ADMIN") {
    return value;
  }
  return null;
};

export const requireRole = (allowed: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const headerValue = req.header("x-user-role") ?? undefined;
    const role = parseRole(headerValue);

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