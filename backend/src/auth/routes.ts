import { Router } from "express";
import { AuthRepository } from "./repository";
import { login, requestPasswordReset, resetPassword, signup } from "./service";
import { clearSessionCookies, setSessionCookies } from "./cookies";
import { createSession, parseCookies, REFRESH_COOKIE, refreshSession, revokeSession } from "./session";

const publicUser = (user: { id: string; name: string; email: string; role: string }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

export const createAuthRouter = (repo: AuthRepository) => {
  const router = Router();

  router.post("/auth/login", async (req, res) => {
    const result = await login(repo, req.body);
    if (!result.ok) {
      const status = result.errors.includes("Identifiants invalides.") ? 401 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    const session = await createSession(repo, result.value.user);
    if (!session.ok) {
      res.status(500).json({ errors: ["Session configuration error"] });
      return;
    }
    setSessionCookies(res, session.value.accessToken, session.value.refreshToken);
    res.json({ user: publicUser(session.value.user) });
  });

  router.post("/auth/signup", async (req, res) => {
    const result = await signup(repo, req.body);
    if (!result.ok) {
      const status = result.code === "conflict" ? 409 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }

    const session = await createSession(repo, result.value.user);
    if (!session.ok) {
      res.status(500).json({ errors: ["Session configuration error"] });
      return;
    }
    setSessionCookies(res, session.value.accessToken, session.value.refreshToken);
    res.status(201).json({ user: publicUser(session.value.user) });
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
    const result = await requestPasswordReset(repo, req.body);
    if (!result.ok) {
      const status = result.code === "validation" ? 400 : 500;
      res.status(status).json({ errors: result.errors });
      return;
    }

    res.json(result.value);
  });

  router.post("/auth/reset-password", async (req, res) => {
    const result = await resetPassword(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }

    res.json(result.value);
  });

  return router;
};
