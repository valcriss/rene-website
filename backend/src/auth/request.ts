import "express";
import { Request } from "express";
import { AuthUser } from "./types";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export const getAuthenticatedUser = (req: Request): AuthUser => {
  if (!req.user) {
    throw new Error("Authenticated user is missing from the request");
  }

  return req.user;
};
