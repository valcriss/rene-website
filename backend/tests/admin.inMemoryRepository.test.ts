import { createInMemoryAdminRepository } from "../src/admin/inMemoryRepository";

describe("admin in-memory repository", () => {
  it("manages users", async () => {
    const repo = createInMemoryAdminRepository();
    const users = await repo.listUsers();
    expect(users.length).toBeGreaterThan(0);

    const created = await repo.createUser({ name: "Marie", email: "marie@test", role: "EDITOR" });
    const fetched = await repo.getUserById(created.id);
    expect(fetched?.email).toBe("marie@test");

    const missingUser = await repo.getUserById("missing");
    expect(missingUser).toBeNull();

    const updated = await repo.updateUser(created.id, { name: "Marie Curie", email: "marie@test", role: "ADMIN" });
    expect(updated?.name).toBe("Marie Curie");

    const missingUpdate = await repo.updateUser("missing", { name: "X", email: "x", role: "EDITOR" });
    expect(missingUpdate).toBeNull();

    const deleted = await repo.deleteUser(created.id);
    expect(deleted).toBe(true);
    const missingDelete = await repo.deleteUser("missing");
    expect(missingDelete).toBe(false);
  });

  it("manages categories", async () => {
    const repo = createInMemoryAdminRepository();
    const categories = await repo.listCategories();
    expect(categories.length).toBeGreaterThan(0);

    const created = await repo.createCategory({ name: "Lecture" });
    const fetched = await repo.getCategoryById(created.id);
    expect(fetched?.name).toBe("Lecture");

    const missingCategory = await repo.getCategoryById("missing");
    expect(missingCategory).toBeNull();

    const updated = await repo.updateCategory(created.id, { name: "Lecture publique" });
    expect(updated?.name).toBe("Lecture publique");

    const missingUpdate = await repo.updateCategory("missing", { name: "X" });
    expect(missingUpdate).toBeNull();

    const deleted = await repo.deleteCategory(created.id);
    expect(deleted).toBe(true);
    const missingDelete = await repo.deleteCategory("missing");
    expect(missingDelete).toBe(false);
  });

  it("creates category with generated id when slug is empty", async () => {
    const repo = createInMemoryAdminRepository();
    const created = await repo.createCategory({ name: "!!!" });
    expect(created.id).not.toBe("");
  });

  it("manages settings", async () => {
    const repo = createInMemoryAdminRepository();
    const settings = await repo.getSettings();
    expect(settings.contactEmail).toBeDefined();

    const updated = await repo.updateSettings({
      contactEmail: "contact@test",
      contactPhone: "0102030405",
      homepageIntro: "Intro"
    });
    expect(updated.homepageIntro).toBe("Intro");
  });
});