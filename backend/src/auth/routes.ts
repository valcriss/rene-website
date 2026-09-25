import { Request, Response, Router } from "express";
import { AuthRepository } from "./repository";
import { normalizeEmail } from "./email";
import { checkAuthThrottle, clearLoginThrottle } from "./rateLimiter";
import { login, requestPasswordReset, resetPassword, signup, verifyEmail } from "./service";
import { clearSessionCookies, setSessionCookies } from "./cookies";
import { createSession, parseCookies, REFRESH_COOKIE, refreshSession, revokeSession } from "./session";
import { auditLogger } from "../security/audit";

const publicUser = (user: { id: string; name: string; email: string; role: string }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

export const createAuthRouter = (repo: AuthRepository) => {
  const router = Router();

  const rejectThrottledRequest = async (
    req: Request,
    res: Response,
    action: "login" | "signup" | "forgot-password" | "reset-password",
    identifier?: string
  ) => {
    const result = await checkAuthThrottle(repo, action, req.ip!, identifier);
    if (result.allowed) return false;
    res.set("Retry-After", String(result.retryAfterSeconds));
    res.status(429).json({ errors: ["Trop de tentatives. Réessayez plus tard."] });
    return true;
  };

  router.post("/auth/login", async (req, res) => {
    if (await rejectThrottledRequest(req, res, "login", normalizeEmail(req.body?.email) ?? undefined)) return;
    const result = await login(repo, req.body);
    if (!result.ok) {
      await auditLogger.record({ requestId: res.locals.requestId, action: "auth.login", outcome: "failure" });
      const status = result.errors.includes("Identifiants invalides.") ? 401 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    await auditLogger.record({ requestId: res.locals.requestId, actorId: result.value.user.id, action: "auth.login", target: `user:${result.value.user.id}`, outcome: "success" });
    await clearLoginThrottle(repo, result.value.user.email);
    const session = await createSession(repo, result.value.user);
    if (!session.ok) {
      res.status(500).json({ errors: ["Session configuration error"] });
      return;
    }
    setSessionCookies(res, session.value.accessToken, session.value.refreshToken);
    res.json({ user: publicUser(session.value.user) });
  });

  router.post("/auth/signup", async (req, res) => {
    if (await rejectThrottledRequest(req, res, "signup")) return;
    const result = await signup(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    res.status(202).json({ message: result.value.message });
  });

  router.get("/auth/session", (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    res.json({ user: publicUser(req.user) });
  });

  router.post("/auth/refresh", async (req, res) => {
    const refreshToken = parseCookies(req.header("cookie"))[REFRESH_COOKIE];
    if (!refreshToken) {
      clearSessionCookies(res);
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const session = await refreshSession(repo, refreshToken);
    if (!session.ok) {
      clearSessionCookies(res);
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    setSessionCookies(res, session.value.accessToken, session.value.refreshToken);
    res.json({ user: publicUser(session.value.user) });
  });

  router.post("/auth/logout", async (req, res) => {
    const refreshToken = parseCookies(req.header("cookie"))[REFRESH_COOKIE];
    if (refreshToken) await revokeSession(repo, refreshToken);
    clearSessionCookies(res);
    res.status(204).send();
  });

  router.post("/auth/forgot-password", async (req, res) => {
    if (await rejectThrottledRequest(req, res, "forgot-password", normalizeEmail(req.body?.email) ?? undefined)) return;
    const result = await requestPasswordReset(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }

    res.json(result.value);
  });

  router.post("/auth/reset-password", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : undefined;
    if (await rejectThrottledRequest(req, res, "reset-password", token)) return;
    const result = await resetPassword(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }

    res.json(result.value);
  });

  router.post("/auth/verify-email", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (await rejectThrottledRequest(req, res, "reset-password", token || undefined)) return;
    const result = await verifyEmail(repo, token);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  });

  return router;
};
