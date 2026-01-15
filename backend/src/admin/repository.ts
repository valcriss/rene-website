import { AdminCategory, AdminSettings, AdminUser, CreateAdminCategoryInput, CreateAdminUserInput } from "./types";

export type AdminRepository = {
  listUsers: () => Promise<AdminUser[]>;
  getUserById: (id: string) => Promise<AdminUser | null>;
  createUser: (input: CreateAdminUserInput) => Promise<AdminUser>;
  updateUser: (id: string, input: CreateAdminUserInput) => Promise<AdminUser | null>;
  deleteUser: (id: string) => Promise<boolean>;

  listCategories: () => Promise<AdminCategory[]>;
  getCategoryById: (id: string) => Promise<AdminCategory | null>;
  createCategory: (input: CreateAdminCategoryInput) => Promise<AdminCategory>;
  updateCategory: (id: string, input: CreateAdminCategoryInput) => Promise<AdminCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;

  getSettings: () => Promise<AdminSettings>;
  updateSettings: (input: AdminSettings) => Promise<AdminSettings>;
};