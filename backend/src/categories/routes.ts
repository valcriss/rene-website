import { Router } from "express";
import { AdminRepository } from "../admin/repository";
import { listAdminCategories } from "../admin/service";

export const createCategoriesRouter = (repo: AdminRepository) => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const categories = await listAdminCategories(repo);
    res.json(categories);
  });

  return router;
};
