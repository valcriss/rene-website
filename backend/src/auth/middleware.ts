import { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "./jwt";

export const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    next();
    return;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const result = verifyUserToken(token);
  if (!result.ok) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  req.user = result.value;
  next();
};
