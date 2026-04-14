import { Router } from "express";
import { AuthRepository } from "./repository";
import { login, signup } from "./service";

export const createAuthRouter = (repo: AuthRepository) => {
  const router = Router();

  router.post("/auth/login", async (req, res) => {
    const result = await login(repo, req.body);
    if (!result.ok) {
      const status = result.errors.includes("Identifiants invalides.") ? 401 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  });

  router.post("/auth/signup", async (req, res) => {
    const result = await signup(repo, req.body);
    if (!result.ok) {
      const status = result.code === "conflict" ? 409 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }

    res.status(201).json(result.value);
  });

  return router;
};
