import { NextFunction, Request, Response } from "express";
import { verifyUserToken } from "./jwt";
import { AuthRepository } from "./repository";
import { ACCESS_COOKIE, csrfTokensMatch, CSRF_COOKIE, parseCookies, REFRESH_COOKIE } from "./session";

const unauthorized = (res: Response) => res.status(401).json({ message: "Authentication required" });

export const createAuthenticationMiddleware = (repo: AuthRepository) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const cookies = parseCookies(req.header("cookie"));
    const token = cookies[ACCESS_COOKIE];

    if (!token) {
      const authorization = process.env.NODE_ENV === "test" ? req.header("authorization") : undefined;
      if (!authorization) {
        next();
        return;
      }
      const [scheme, bearer] = authorization.split(" ");
      const verified = scheme?.toLowerCase() === "bearer" && bearer ? verifyUserToken(bearer) : null;
      if (!verified || !verified.ok) {
        unauthorized(res);
        return;
      }
      req.user = verified.value;
      next();
      return;
    }

    const verified = verifyUserToken(token);
    if (!verified.ok || !verified.value.sessionId || verified.value.sessionVersion === undefined) {
      if (req.path === "/api/auth/refresh" || req.path === "/api/auth/logout") {
        next();
        return;
      }
      unauthorized(res);
      return;
    }

    const [session, user] = await Promise.all([
      repo.getSessionById!(verified.value.sessionId),
      repo.getUserById(verified.value.id)
    ]);
    const currentVersion = user?.sessionVersion ?? 0;
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !user ||
      user.emailVerifiedAt === null ||
      user.accountStatus === "INVITED" ||
      user.accountStatus === "SUSPENDED" ||
      session.userId !== user.id ||
      session.sessionVersion !== currentVersion ||
      verified.value.sessionVersion !== currentVersion
    ) {
      unauthorized(res);
      return;
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role, authenticatedAt: verified.value.authenticatedAt };
    next();
  };

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const cookies = parseCookies(req.header("cookie"));
  if (!cookies[ACCESS_COOKIE] && !cookies[REFRESH_COOKIE]) {
    next();
    return;
  }
  if (!csrfTokensMatch(cookies[CSRF_COOKIE], req.header("x-csrf-token"))) {
    res.status(403).json({ message: "CSRF validation failed" });
    return;
  }
  next();
};

export const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.header("authorization");
  if (!authorization) {
    next();
    return;
  }
  const [scheme, token] = authorization.split(" ");
  const verified = scheme?.toLowerCase() === "bearer" && token ? verifyUserToken(token) : null;
  if (!verified || !verified.ok) {
    unauthorized(res);
    return;
  }
  req.user = verified.value;
  next();
};
