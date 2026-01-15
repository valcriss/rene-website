import { AdminRepository } from "./repository";
import {
  AdminCategory,
  AdminSettings,
  AdminUser,
  CreateAdminCategoryInput,
  CreateAdminUserInput,
  UpdateAdminSettingsInput
} from "./types";
import { UserRole } from "../auth/roles";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseRole = (value: unknown): UserRole | null => {
  if (value === "EDITOR" || value === "MODERATOR" || value === "ADMIN") {
    return value;
  }
  return null;
};

const validateUserInput = (input: unknown): ServiceResult<CreateAdminUserInput> => {
  const data = input as Partial<CreateAdminUserInput>;
  const errors: string[] = [];

  if (!isNonEmptyString(data.name)) errors.push("name is required");
  if (!isNonEmptyString(data.email)) errors.push("email is required");
  const role = parseRole(data.role);
  if (!role) errors.push("role is invalid");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const safeRole = role as UserRole;
  return {
    ok: true,
    value: {
      name: data.name!.trim(),
      email: data.email!.trim(),
      role: safeRole
    }
  };
};

const validateCategoryInput = (input: unknown): ServiceResult<CreateAdminCategoryInput> => {
  const data = input as Partial<CreateAdminCategoryInput>;
  if (!isNonEmptyString(data.name)) {
    return { ok: false, errors: ["name is required"] };
  }
  return { ok: true, value: { name: data.name.trim() } };
};

const validateSettingsInput = (input: unknown): ServiceResult<UpdateAdminSettingsInput> => {
  const data = input as Partial<UpdateAdminSettingsInput>;
  const errors: string[] = [];
  if (!isNonEmptyString(data.contactEmail)) errors.push("contactEmail is required");
  if (!isNonEmptyString(data.contactPhone)) errors.push("contactPhone is required");
  if (!isNonEmptyString(data.homepageIntro)) errors.push("homepageIntro is required");
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      contactEmail: data.contactEmail!.trim(),
      contactPhone: data.contactPhone!.trim(),
      homepageIntro: data.homepageIntro!.trim()
    }
  };
};

export const listAdminUsers = (repo: AdminRepository): Promise<AdminUser[]> => repo.listUsers();

export const createAdminUser = async (
  repo: AdminRepository,
  input: unknown
): Promise<ServiceResult<AdminUser>> => {
  const validation = validateUserInput(input);
  if (!validation.ok) return validation;
  const created = await repo.createUser(validation.value);
  return { ok: true, value: created };
};

export const updateAdminUser = async (
  repo: AdminRepository,
  id: string,
  input: unknown
): Promise<ServiceResult<AdminUser>> => {
  const validation = validateUserInput(input);
  if (!validation.ok) return validation;
  const updated = await repo.updateUser(id, validation.value);
  if (!updated) return { ok: false, errors: ["User not found"] };
  return { ok: true, value: updated };
};

export const deleteAdminUser = async (
  repo: AdminRepository,
  id: string
): Promise<ServiceResult<null>> => {
  const deleted = await repo.deleteUser(id);
  if (!deleted) return { ok: false, errors: ["User not found"] };
  return { ok: true, value: null };
};

export const listAdminCategories = (repo: AdminRepository): Promise<AdminCategory[]> =>
  repo.listCategories();

export const createAdminCategory = async (
  repo: AdminRepository,
  input: unknown
): Promise<ServiceResult<AdminCategory>> => {
  const validation = validateCategoryInput(input);
  if (!validation.ok) return validation;
  const created = await repo.createCategory(validation.value);
  return { ok: true, value: created };
};

export const updateAdminCategory = async (
  repo: AdminRepository,
  id: string,
  input: unknown
): Promise<ServiceResult<AdminCategory>> => {
  const validation = validateCategoryInput(input);
  if (!validation.ok) return validation;
  const updated = await repo.updateCategory(id, validation.value);
  if (!updated) return { ok: false, errors: ["Category not found"] };
  return { ok: true, value: updated };
};

export const deleteAdminCategory = async (
  repo: AdminRepository,
  id: string
): Promise<ServiceResult<null>> => {
  const deleted = await repo.deleteCategory(id);
  if (!deleted) return { ok: false, errors: ["Category not found"] };
  return { ok: true, value: null };
};

export const getAdminSettings = (repo: AdminRepository): Promise<AdminSettings> => repo.getSettings();

export const updateAdminSettings = async (
  repo: AdminRepository,
  input: unknown
): Promise<ServiceResult<AdminSettings>> => {
  const validation = validateSettingsInput(input);
  if (!validation.ok) return validation;
  const updated = await repo.updateSettings(validation.value);
  return { ok: true, value: updated };
};