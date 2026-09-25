import { AccountStatus } from "../auth/types";
import { UserRole } from "../auth/roles";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAudience = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSettings = {
  contactEmail: string;
  contactPhone: string;
  homepageIntro: string;
  homepageSubtitle: string;
  legalNotice: string;
};

export type CreateAdminUserInput = {
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: AccountStatus;
};

export type UpdateAdminUserInput = CreateAdminUserInput;

export type CreateAdminCategoryInput = {
  name: string;
};

export type UpdateAdminCategoryInput = CreateAdminCategoryInput;

export type CreateAdminAudienceInput = {
  name: string;
};

export type UpdateAdminAudienceInput = CreateAdminAudienceInput;

export type UpdateAdminSettingsInput = Omit<AdminSettings, "homepageSubtitle" | "legalNotice"> & {
  homepageSubtitle?: string;
  legalNotice?: string;
};
