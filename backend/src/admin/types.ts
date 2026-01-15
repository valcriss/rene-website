import { UserRole } from "../auth/roles";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSettings = {
  contactEmail: string;
  contactPhone: string;
  homepageIntro: string;
};

export type CreateAdminUserInput = {
  name: string;
  email: string;
  role: UserRole;
};

export type UpdateAdminUserInput = CreateAdminUserInput;

export type CreateAdminCategoryInput = {
  name: string;
};

export type UpdateAdminCategoryInput = CreateAdminCategoryInput;

export type UpdateAdminSettingsInput = AdminSettings;