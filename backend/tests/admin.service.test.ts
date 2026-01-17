import {
  createAdminCategory,
  createAdminUser,
  deleteAdminCategory,
  deleteAdminUser,
  updateAdminCategory,
  updateAdminSettings,
  updateAdminUser
} from "../src/admin/service";
import { AdminRepository } from "../src/admin/repository";

const baseRepo: AdminRepository = {
  listUsers: async () => [],
  getUserById: async () => null,
  createUser: async (input) => ({ id: "1", ...input, createdAt: "", updatedAt: "" }),
  updateUser: async () => null,
  deleteUser: async () => false,
  listCategories: async () => [],
  getCategoryById: async () => null,
  createCategory: async () => ({ id: "cat", name: "Cat", createdAt: "", updatedAt: "" }),
  updateCategory: async () => null,
  deleteCategory: async () => false,
  getSettings: async () => ({ contactEmail: "", contactPhone: "", homepageIntro: "" }),
  updateSettings: async (input) => ({ ...input })
};

describe("admin service", () => {
  it("validates user input", async () => {
    const result = await createAdminUser(baseRepo, { name: "", email: "", role: "BAD" });
    expect(result.ok).toBe(false);
  });

  it("returns not found on update user", async () => {
    const result = await updateAdminUser(baseRepo, "missing", {
      name: "John",
      email: "john@test",
      role: "ADMIN"
    });
    expect(result.ok).toBe(false);
  });

  it("returns not found on delete user", async () => {
    const result = await deleteAdminUser(baseRepo, "missing");
    expect(result.ok).toBe(false);
  });

  it("returns errors when create category throws", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      createCategory: async () => {
        throw new Error("Category already exists");
      }
    };
    const result = await createAdminCategory(repo, { name: "Music" });
    expect(result.ok).toBe(false);
  });

  it("handles non-error thrown during create category", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      createCategory: async () => {
        throw "boom";
      }
    };
    const result = await createAdminCategory(repo, { name: "Music" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("returns not found on update category", async () => {
    const result = await updateAdminCategory(baseRepo, "missing", { name: "Music" });
    expect(result.ok).toBe(false);
  });

  it("returns errors when update category throws", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      updateCategory: async () => {
        throw new Error("boom");
      }
    };
    const result = await updateAdminCategory(repo, "id", { name: "Music" });
    expect(result.ok).toBe(false);
  });

  it("handles non-error thrown during update category", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      updateCategory: async () => {
        throw "boom";
      }
    };
    const result = await updateAdminCategory(repo, "id", { name: "Music" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("returns errors when delete category throws", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      deleteCategory: async () => {
        throw new Error("Category in use");
      }
    };
    const result = await deleteAdminCategory(repo, "id");
    expect(result.ok).toBe(false);
  });

  it("handles non-error thrown during delete category", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      deleteCategory: async () => {
        throw "boom";
      }
    };
    const result = await deleteAdminCategory(repo, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("validates settings input", async () => {
    const result = await updateAdminSettings(baseRepo, { contactEmail: "", contactPhone: "", homepageIntro: "" });
    expect(result.ok).toBe(false);
  });
});
