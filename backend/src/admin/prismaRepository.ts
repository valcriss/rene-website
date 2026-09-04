import { prisma } from "../prisma/client";
import { AdminRepository } from "./repository";
import {
  AdminAudience,
  AdminCategory,
  AdminSettings,
  AdminUser,
  CreateAdminAudienceInput,
  CreateAdminCategoryInput
} from "./types";
import { slugifyCategoryId } from "./slug";

type PrismaUser = {
  id: string;
  name: string;
  email: string;
  role: "EDITOR" | "MODERATOR" | "ADMIN";
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaWithAudience = typeof prisma & {
  user: {
    findMany(args: unknown): Promise<PrismaUser[]>;
    findUnique(args: unknown): Promise<PrismaUser | null>;
    create(args: unknown): Promise<PrismaUser>;
    update(args: unknown): Promise<PrismaUser>;
    delete(args: unknown): Promise<unknown>;
  };
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
  siteSetting: {
    findUnique(args: unknown): Promise<PrismaSiteSetting | null>;
    upsert(args: unknown): Promise<PrismaSiteSetting>;
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

type PrismaSiteSetting = {
  id: string;
  contactEmail: string;
  contactPhone: string;
  homepageIntro: string;
  homepageSubtitle: string;
  createdAt: Date;
  updatedAt: Date;
};

const defaultSiteSettings: AdminSettings = {
  contactEmail: "contact@rene-website.test",
  contactPhone: "0102030405",
  homepageIntro: "Plateforme culturelle de Descartes.",
  homepageSubtitle: ""
};

const defaultSiteSettingsId = "default";

const toAdminUser = (data: PrismaUser): AdminUser => ({
  id: data.id,
  name: data.name,
  email: data.email,
  role: data.role,
  createdAt: data.createdAt.toISOString(),
  updatedAt: data.updatedAt.toISOString()
});

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

const toAdminSettings = (data: PrismaSiteSetting): AdminSettings => ({
  contactEmail: data.contactEmail,
  contactPhone: data.contactPhone,
  homepageIntro: data.homepageIntro,
  homepageSubtitle: data.homepageSubtitle
});

export const createPrismaAdminRepository = (): AdminRepository => {
  const prismaWithAudience = prisma as PrismaWithAudience;

  return {
    listUsers: async () =>
      prismaWithAudience.user
        .findMany({ orderBy: { createdAt: "desc" } })
        .then((items: PrismaUser[]) => items.map(toAdminUser)),
    getUserById: async (id) =>
      prismaWithAudience.user
        .findUnique({ where: { id } })
        .then((item: PrismaUser | null) => (item ? toAdminUser(item) : null)),
    createUser: async (input) => {
      const created = await prismaWithAudience.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: ""
        }
      });
      return toAdminUser(created);
    },
    updateUser: async (id, input) => {
      try {
        const updated = await prismaWithAudience.user.update({
          where: { id },
          data: {
            name: input.name,
            email: input.email,
            role: input.role
          }
        });
        return toAdminUser(updated);
      } catch {
        return null;
      }
    },
    deleteUser: async (id) => {
      try {
        await prismaWithAudience.user.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },

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

    getSettings: async () => {
      const settings = await prismaWithAudience.siteSetting.findUnique({
        where: { id: defaultSiteSettingsId }
      });
      return settings ? toAdminSettings(settings) : defaultSiteSettings;
    },
    updateSettings: async (input) => {
      const settings = await prismaWithAudience.siteSetting.upsert({
        where: { id: defaultSiteSettingsId },
        create: {
          id: defaultSiteSettingsId,
          ...input
        },
        update: input
      });
      return toAdminSettings(settings);
    }
  };
};
