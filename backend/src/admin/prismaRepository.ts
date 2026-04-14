import { randomUUID } from "node:crypto";
import { prisma } from "../prisma/client";
import { AdminRepository } from "./repository";
import {
  AdminAudience,
  AdminCategory,
  AdminSettings,
  AdminUser,
  CreateAdminAudienceInput,
  CreateAdminCategoryInput,
  CreateAdminUserInput
} from "./types";
import { slugifyCategoryId } from "./slug";

type PrismaWithAudience = typeof prisma & {
  audience: {
    findMany(args: unknown): Promise<PrismaAudience[]>;
    findUnique(args: unknown): Promise<PrismaAudience | null>;
    create(args: unknown): Promise<PrismaAudience>;
    update(args: unknown): Promise<PrismaAudience>;
    delete(args: unknown): Promise<unknown>;
  };
  event: {
    count(args: unknown): Promise<number>;
  };
};

type PrismaCategory = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAudience = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const toAdminCategory = (data: PrismaCategory): AdminCategory => ({
  id: data.id,
  name: data.name,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

const toAdminAudience = (data: PrismaAudience): AdminAudience => ({
  id: data.id,
  name: data.name,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

export const createPrismaAdminRepository = (): AdminRepository => {
  const prismaWithAudience = prisma as PrismaWithAudience;
  const users = new Map<string, AdminUser>();
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

  seedUser({ name: "Admin", email: "admin@rene-website.test", role: "ADMIN" });

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

    listCategories: async () =>
      prisma.category
        .findMany({ orderBy: { name: "asc" } })
        .then((items: PrismaCategory[]) => items.map(toAdminCategory)),
    getCategoryById: async (id) =>
      prisma.category
        .findUnique({ where: { id } })
        .then((item: PrismaCategory | null) => (item ? toAdminCategory(item) : null)),
    createCategory: async (input: CreateAdminCategoryInput) => {
      const id = slugifyCategoryId(input.name);
      if (!id) {
        throw new Error("Category name is invalid");
      }
      const existing = await prisma.category.findUnique({ where: { id } });
      if (existing) {
        throw new Error("Category already exists");
      }
      const created = await prisma.category.create({
        data: {
          id,
          name: input.name.trim()
        }
      });
      return toAdminCategory(created);
    },
    updateCategory: async (id, input) => {
      try {
        const updated = await prisma.category.update({
          where: { id },
          data: { name: input.name.trim() }
        });
        return toAdminCategory(updated);
      } catch {
        return null;
      }
    },
    deleteCategory: async (id) => {
      const eventsCount = await prisma.event.count({ where: { categoryId: id } });
      if (eventsCount > 0) {
        throw new Error("Category in use");
      }
      try {
        await prisma.category.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },

    listAudiences: async () =>
      prismaWithAudience.audience
        .findMany({ orderBy: { name: "asc" } })
        .then((items: PrismaAudience[]) => items.map(toAdminAudience)),
    getAudienceById: async (id) =>
      prismaWithAudience.audience
        .findUnique({ where: { id } })
        .then((item: PrismaAudience | null) => (item ? toAdminAudience(item) : null)),
    createAudience: async (input: CreateAdminAudienceInput) => {
      const id = slugifyCategoryId(input.name);
      if (!id) {
        throw new Error("Audience name is invalid");
      }
      const existing = await prismaWithAudience.audience.findUnique({ where: { id } });
      if (existing) {
        throw new Error("Audience already exists");
      }
      const created = await prismaWithAudience.audience.create({
        data: {
          id,
          name: input.name.trim()
        }
      });
      return toAdminAudience(created);
    },
    updateAudience: async (id, input) => {
      try {
        const updated = await prismaWithAudience.audience.update({
          where: { id },
          data: { name: input.name.trim() }
        });
        return toAdminAudience(updated);
      } catch {
        return null;
      }
    },
    deleteAudience: async (id) => {
      const eventsCount = await prismaWithAudience.event.count({ where: { audienceId: id } });
      if (eventsCount > 0) {
        throw new Error("Audience in use");
      }
      try {
        await prismaWithAudience.audience.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },

    getSettings: async () => settings,
    updateSettings: async (input) => {
      settings = { ...input };
      return settings;
    }
  };
};
