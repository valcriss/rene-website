import { randomUUID } from "node:crypto";
import { AdminRepository } from "./repository";
import {
  AdminCategory,
  AdminSettings,
  AdminUser,
  CreateAdminCategoryInput,
  CreateAdminUserInput
} from "./types";

export const createInMemoryAdminRepository = (): AdminRepository => {
  const users = new Map<string, AdminUser>();
  const categories = new Map<string, AdminCategory>();
  let settings: AdminSettings = {
    contactEmail: "contact@rene-website.test",
    contactPhone: "0102030405",
    homepageIntro: "Plateforme culturelle de Descartes."
  };

  const now = () => new Date().toISOString();

  const seedUser = (input: CreateAdminUserInput) => {
    const id = randomUUID();
    const timestamp = now();
    users.set(id, { id, ...input, createdAt: timestamp, updatedAt: timestamp });
  };
  const seedCategory = (input: CreateAdminCategoryInput) => {
    const id = randomUUID();
    const timestamp = now();
    categories.set(id, { id, ...input, createdAt: timestamp, updatedAt: timestamp });
  };

  seedUser({ name: "Admin", email: "admin@rene-website.test", role: "ADMIN" });
  seedCategory({ name: "Musique" });
  seedCategory({ name: "Théâtre" });

  return {
    listUsers: async () => Array.from(users.values()),
    getUserById: async (id) => users.get(id) ?? null,
    createUser: async (input) => {
      const id = randomUUID();
      const timestamp = now();
      const user: AdminUser = { id, ...input, createdAt: timestamp, updatedAt: timestamp };
      users.set(id, user);
      return user;
    },
    updateUser: async (id, input) => {
      const existing = users.get(id);
      if (!existing) return null;
      const updated: AdminUser = { ...existing, ...input, updatedAt: now() };
      users.set(id, updated);
      return updated;
    },
    deleteUser: async (id) => users.delete(id),

    listCategories: async () => Array.from(categories.values()),
    getCategoryById: async (id) => categories.get(id) ?? null,
    createCategory: async (input) => {
      const id = randomUUID();
      const timestamp = now();
      const category: AdminCategory = { id, ...input, createdAt: timestamp, updatedAt: timestamp };
      categories.set(id, category);
      return category;
    },
    updateCategory: async (id, input) => {
      const existing = categories.get(id);
      if (!existing) return null;
      const updated: AdminCategory = { ...existing, ...input, updatedAt: now() };
      categories.set(id, updated);
      return updated;
    },
    deleteCategory: async (id) => categories.delete(id),

    getSettings: async () => settings,
    updateSettings: async (input) => {
      settings = { ...input };
      return settings;
    }
  };
};