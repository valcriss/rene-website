import { Router } from "express";
import { requireRole } from "../auth/roles";
import { AdminRepository } from "./repository";
import {
  createAdminCategory,
  createAdminUser,
  deleteAdminCategory,
  deleteAdminUser,
  getAdminSettings,
  listAdminCategories,
  listAdminUsers,
  updateAdminCategory,
  updateAdminSettings,
  updateAdminUser
} from "./service";

export const createAdminRouter = (repo: AdminRepository) => {
  const router = Router();

  router.use(requireRole(["ADMIN"]));

  router.get("/users", async (_req, res) => {
    const users = await listAdminUsers(repo);
    res.json(users);
  });

  router.post("/users", async (req, res) => {
    const result = await createAdminUser(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    res.status(201).json(result.value);
  });

  router.put("/users/:id", async (req, res) => {
    const result = await updateAdminUser(repo, req.params.id, req.body);
    if (!result.ok) {
      const status = result.errors.includes("User not found") ? 404 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  });

  router.delete("/users/:id", async (req, res) => {
    const result = await deleteAdminUser(repo, req.params.id);
    if (!result.ok) {
      res.status(404).json({ errors: result.errors });
      return;
    }
    res.status(204).send();
  });

  router.get("/categories", async (_req, res) => {
    const categories = await listAdminCategories(repo);
    res.json(categories);
  });

  router.post("/categories", async (req, res) => {
    const result = await createAdminCategory(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    res.status(201).json(result.value);
  });

  router.put("/categories/:id", async (req, res) => {
    const result = await updateAdminCategory(repo, req.params.id, req.body);
    if (!result.ok) {
      const status = result.errors.includes("Category not found") ? 404 : 400;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  });

  router.delete("/categories/:id", async (req, res) => {
    const result = await deleteAdminCategory(repo, req.params.id);
    if (!result.ok) {
      const status = result.errors.includes("Category in use") ? 409 : 404;
      res.status(status).json({ errors: result.errors });
      return;
    }
    res.status(204).send();
  });

  router.get("/settings", async (_req, res) => {
    const settings = await getAdminSettings(repo);
    res.json(settings);
  });

  router.put("/settings", async (req, res) => {
    const result = await updateAdminSettings(repo, req.body);
    if (!result.ok) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    res.json(result.value);
  });

  return router;
};