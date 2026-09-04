import {
  createAdminAudience,
  createAdminCategory,
  createAdminUser,
  deleteAdminAudience,
  deleteAdminCategory,
  deleteAdminUser,
  getAdminSettings,
  listAdminAudiences,
  listAdminCategories,
  listAdminUsers,
  updateAdminAudience,
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
  listAudiences: async () => [],
  getAudienceById: async () => null,
  createAudience: async () => ({ id: "aud", name: "Tous publics", createdAt: "", updatedAt: "" }),
  updateAudience: async () => null,
  deleteAudience: async () => false,
  getSettings: async () => ({ contactEmail: "", contactPhone: "", homepageIntro: "", homepageSubtitle: "" }),
  updateSettings: async (input) => ({ ...input })
};

describe("admin service", () => {
  it("lists users categories audiences and settings", async () => {
    await expect(listAdminUsers(baseRepo)).resolves.toEqual([]);
    await expect(listAdminCategories(baseRepo)).resolves.toEqual([]);
    await expect(listAdminAudiences(baseRepo)).resolves.toEqual([]);
    await expect(getAdminSettings(baseRepo)).resolves.toEqual({
      contactEmail: "",
      contactPhone: "",
      homepageIntro: "",
      homepageSubtitle: ""
    });
  });

  it("validates user input", async () => {
    const result = await createAdminUser(baseRepo, { name: "", email: "", role: "BAD" });
    expect(result.ok).toBe(false);
  });

  it("creates user with trimmed values", async () => {
    const result = await createAdminUser(baseRepo, {
      name: "  John  ",
      email: "  john@test  ",
      role: "ADMIN"
    });

    expect(result).toEqual({
      ok: true,
      value: {
        id: "1",
        name: "John",
        email: "john@test",
        role: "ADMIN",
        createdAt: "",
        updatedAt: ""
      }
    });
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

  it("creates and updates category with trimmed values", async () => {
    const createResult = await createAdminCategory(baseRepo, { name: "  Music  " });
    const updateRepo: AdminRepository = {
      ...baseRepo,
      updateCategory: async (id, input) => ({ id, ...input, createdAt: "", updatedAt: "" })
    };
    const updateResult = await updateAdminCategory(updateRepo, "cat", { name: "  Music  " });

    expect(createResult.ok).toBe(true);
    expect(updateResult).toEqual({
      ok: true,
      value: { id: "cat", name: "Music", createdAt: "", updatedAt: "" }
    });
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

  it("updates settings with trimmed values", async () => {
    const result = await updateAdminSettings(baseRepo, {
      contactEmail: " contact@test ",
      contactPhone: " 0102030405 ",
      homepageIntro: " Bienvenue ",
      homepageSubtitle: " Sous-titre "
    });

    expect(result).toEqual({
      ok: true,
      value: {
        contactEmail: "contact@test",
        contactPhone: "0102030405",
        homepageIntro: "Bienvenue",
        homepageSubtitle: "Sous-titre"
      }
    });
  });

  it("keeps homepage subtitle optional in settings", async () => {
    const result = await updateAdminSettings(baseRepo, {
      contactEmail: " contact@test ",
      contactPhone: " 0102030405 ",
      homepageIntro: " Bienvenue "
    });

    expect(result).toEqual({
      ok: true,
      value: {
        contactEmail: "contact@test",
        contactPhone: "0102030405",
        homepageIntro: "Bienvenue",
        homepageSubtitle: ""
      }
    });
  });

  it("validates audience input", async () => {
    const result = await createAdminAudience(baseRepo, { name: "" });
    expect(result.ok).toBe(false);
  });

  it("creates audience with trimmed values", async () => {
    const result = await createAdminAudience(baseRepo, { name: "  Tous publics  " });
    expect(result).toEqual({
      ok: true,
      value: { id: "aud", name: "Tous publics", createdAt: "", updatedAt: "" }
    });
  });

  it("returns errors when create audience throws", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      createAudience: async () => {
        throw new Error("Audience already exists");
      }
    };
    const result = await createAdminAudience(repo, { name: "Jeunes" });
    expect(result.ok).toBe(false);
  });

  it("handles non-error thrown during create audience", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      createAudience: async () => {
        throw "boom";
      }
    };
    const result = await createAdminAudience(repo, { name: "Jeunes" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("returns not found on update audience", async () => {
    const result = await updateAdminAudience(baseRepo, "missing", { name: "Jeunes" });
    expect(result.ok).toBe(false);
  });

  it("updates audience with trimmed values", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      updateAudience: async (id, input) => ({ id, ...input, createdAt: "", updatedAt: "" })
    };
    const result = await updateAdminAudience(repo, "aud", { name: "  Jeunes  " });
    expect(result).toEqual({
      ok: true,
      value: { id: "aud", name: "Jeunes", createdAt: "", updatedAt: "" }
    });
  });

  it("returns errors when update audience throws", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      updateAudience: async () => {
        throw new Error("boom");
      }
    };
    const result = await updateAdminAudience(repo, "aud", { name: "Jeunes" });
    expect(result.ok).toBe(false);
  });

  it("handles non-error thrown during update audience", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      updateAudience: async () => {
        throw "boom";
      }
    };
    const result = await updateAdminAudience(repo, "aud", { name: "Jeunes" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });

  it("returns not found on delete audience", async () => {
    const result = await deleteAdminAudience(baseRepo, "missing");
    expect(result.ok).toBe(false);
  });

  it("returns errors when delete audience throws", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      deleteAudience: async () => {
        throw new Error("Audience in use");
      }
    };
    const result = await deleteAdminAudience(repo, "aud");
    expect(result.ok).toBe(false);
  });

  it("handles non-error thrown during delete audience", async () => {
    const repo: AdminRepository = {
      ...baseRepo,
      deleteAudience: async () => {
        throw "boom";
      }
    };
    const result = await deleteAdminAudience(repo, "aud");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Erreur inconnue");
    }
  });
});
