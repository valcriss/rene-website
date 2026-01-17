import { Router } from "express";
import { AuthRepository } from "./repository";
import { login } from "./service";

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

  return router;
};
