jest.mock("@prisma/client", () => {
  const userFindMany = jest.fn();
  const userFindUnique = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const userDelete = jest.fn();
  const categoryFindMany = jest.fn();
  const categoryFindUnique = jest.fn();
  const categoryCreate = jest.fn();
  const categoryUpdate = jest.fn();
  const categoryDelete = jest.fn();
  const audienceFindMany = jest.fn();
  const audienceFindUnique = jest.fn();
  const audienceCreate = jest.fn();
  const audienceUpdate = jest.fn();
  const audienceDelete = jest.fn();
  const count = jest.fn();

  return {
    PrismaClient: jest.fn(() => ({
      user: {
        findMany: userFindMany,
        findUnique: userFindUnique,
        create: userCreate,
        update: userUpdate,
        delete: userDelete
      },
      category: {
        findMany: categoryFindMany,
        findUnique: categoryFindUnique,
        create: categoryCreate,
        update: categoryUpdate,
        delete: categoryDelete
      },
      audience: {
        findMany: audienceFindMany,
        findUnique: audienceFindUnique,
        create: audienceCreate,
        update: audienceUpdate,
        delete: audienceDelete
      },
      event: {
        count
      }
    })),
    __mocks: {
      userFindMany,
      userFindUnique,
      userCreate,
      userUpdate,
      userDelete,
      categoryFindMany,
      categoryFindUnique,
      categoryCreate,
      categoryUpdate,
      categoryDelete,
      audienceFindMany,
      audienceFindUnique,
      audienceCreate,
      audienceUpdate,
      audienceDelete,
      count
    }
  };
});

import { createPrismaAdminRepository } from "../src/admin/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  userFindMany: jest.Mock;
  userFindUnique: jest.Mock;
  userCreate: jest.Mock;
  userUpdate: jest.Mock;
  userDelete: jest.Mock;
  categoryFindMany: jest.Mock;
  categoryFindUnique: jest.Mock;
  categoryCreate: jest.Mock;
  categoryUpdate: jest.Mock;
  categoryDelete: jest.Mock;
  audienceFindMany: jest.Mock;
  audienceFindUnique: jest.Mock;
  audienceCreate: jest.Mock;
  audienceUpdate: jest.Mock;
  audienceDelete: jest.Mock;
  count: jest.Mock;
};

describe("createPrismaAdminRepository", () => {
  beforeEach(() => {
    prismaMocks.userFindMany.mockReset();
    prismaMocks.userFindUnique.mockReset();
    prismaMocks.userCreate.mockReset();
    prismaMocks.userUpdate.mockReset();
    prismaMocks.userDelete.mockReset();
    prismaMocks.categoryFindMany.mockReset();
    prismaMocks.categoryFindUnique.mockReset();
    prismaMocks.categoryCreate.mockReset();
    prismaMocks.categoryUpdate.mockReset();
    prismaMocks.categoryDelete.mockReset();
    prismaMocks.audienceFindMany.mockReset();
    prismaMocks.audienceFindUnique.mockReset();
    prismaMocks.audienceCreate.mockReset();
    prismaMocks.audienceUpdate.mockReset();
    prismaMocks.audienceDelete.mockReset();
    prismaMocks.count.mockReset();
  });

  it("lists users from prisma", async () => {
    prismaMocks.userFindMany.mockResolvedValue([
      {
        id: "user-1",
        name: "Admin",
        email: "admin@test",
        role: "ADMIN",
        passwordHash: "hash",
        createdAt: new Date("2026-05-22T09:00:00.000Z"),
        updatedAt: new Date("2026-05-22T09:30:00.000Z")
      },
      {
        id: "user-2",
        name: "Editor",
        email: "editor@test",
        role: "EDITOR",
        passwordHash: "hash",
        createdAt: new Date("2026-05-22T08:00:00.000Z"),
        updatedAt: new Date("2026-05-22T08:30:00.000Z")
      }
    ]);

    const repo = createPrismaAdminRepository();
    const users = await repo.listUsers();

    expect(prismaMocks.userFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(users).toHaveLength(2);
    expect(users[0].email).toBe("admin@test");
  });

  it("gets user by id from prisma", async () => {
    prismaMocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@test",
      role: "ADMIN",
      passwordHash: "hash",
      createdAt: new Date("2026-05-22T09:00:00.000Z"),
      updatedAt: new Date("2026-05-22T09:30:00.000Z")
    });

    const repo = createPrismaAdminRepository();
    const fetched = await repo.getUserById("user-1");

    expect(fetched?.email).toBe("admin@test");
  });

  it("creates a user in prisma", async () => {
    prismaMocks.userCreate.mockResolvedValue({
      id: "user-3",
      name: "Alice",
      email: "alice@test",
      role: "EDITOR",
      passwordHash: "",
      createdAt: new Date("2026-05-22T09:00:00.000Z"),
      updatedAt: new Date("2026-05-22T09:00:00.000Z")
    });

    const repo = createPrismaAdminRepository();
    const created = await repo.createUser({ name: "Alice", email: "alice@test", role: "EDITOR" });

    expect(prismaMocks.userCreate).toHaveBeenCalledWith({
      data: {
        name: "Alice",
        email: "alice@test",
        role: "EDITOR",
        passwordHash: ""
      }
    });
    expect(created.email).toBe("alice@test");
  });

  it("updates a user in prisma", async () => {
    prismaMocks.userUpdate.mockResolvedValue({
      id: "user-3",
      name: "Alice2",
      email: "a2@test",
      role: "ADMIN",
      passwordHash: "",
      createdAt: new Date("2026-05-22T09:00:00.000Z"),
      updatedAt: new Date("2026-05-22T09:10:00.000Z")
    });

    const repo = createPrismaAdminRepository();
    const updated = await repo.updateUser("user-3", { name: "Alice2", email: "a2@test", role: "ADMIN" });

    expect(updated?.name).toBe("Alice2");
  });

  it("returns null when updating missing user", async () => {
    prismaMocks.userUpdate.mockRejectedValue(new Error("missing"));
    const repo = createPrismaAdminRepository();
    const updated = await repo.updateUser("missing", { name: "x", email: "x@test", role: "ADMIN" });
    expect(updated).toBeNull();
  });

  it("returns null when user not found", async () => {
    prismaMocks.userFindUnique.mockResolvedValue(null);
    const repo = createPrismaAdminRepository();
    const user = await repo.getUserById("missing");
    expect(user).toBeNull();
  });

  it("deletes a user in prisma", async () => {
    prismaMocks.userDelete.mockResolvedValue({ id: "user-3" });
    const repo = createPrismaAdminRepository();
    const deleted = await repo.deleteUser("user-3");
    expect(deleted).toBe(true);
  });

  it("returns false when deleting missing user", async () => {
    prismaMocks.userDelete.mockRejectedValue(new Error("missing"));
    const repo = createPrismaAdminRepository();
    const deleted = await repo.deleteUser("missing");
    expect(deleted).toBe(false);
  });

  it("lists categories", async () => {
    prismaMocks.categoryFindMany.mockResolvedValue([
      { id: "music", name: "Musique", createdAt: new Date(), updatedAt: new Date() }
    ]);
    const repo = createPrismaAdminRepository();
    const categories = await repo.listCategories();
    expect(categories[0].id).toBe("music");
  });

  it("gets category by id", async () => {
    prismaMocks.categoryFindUnique.mockResolvedValue({
      id: "music",
      name: "Musique",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    const category = await repo.getCategoryById("music");
    expect(category?.name).toBe("Musique");
  });

  it("returns null when category not found", async () => {
    prismaMocks.categoryFindUnique.mockResolvedValue(null);
    const repo = createPrismaAdminRepository();
    const category = await repo.getCategoryById("missing");
    expect(category).toBeNull();
  });

  it("creates category", async () => {
    prismaMocks.categoryFindUnique.mockResolvedValue(null);
    prismaMocks.categoryCreate.mockResolvedValue({
      id: "lecture",
      name: "Lecture",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    const created = await repo.createCategory({ name: "Lecture" });
    expect(created.id).toBe("lecture");
  });

  it("throws when category name is invalid", async () => {
    const repo = createPrismaAdminRepository();
    await expect(repo.createCategory({ name: "" })).rejects.toThrow("Category name is invalid");
  });

  it("throws when category already exists", async () => {
    prismaMocks.categoryFindUnique.mockResolvedValue({
      id: "lecture",
      name: "Lecture",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    await expect(repo.createCategory({ name: "Lecture" })).rejects.toThrow("Category already exists");
  });

  it("updates category", async () => {
    prismaMocks.categoryUpdate.mockResolvedValue({
      id: "lecture",
      name: "Lecture",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    const updated = await repo.updateCategory("lecture", { name: "Lecture" });
    expect(updated?.id).toBe("lecture");
  });

  it("returns null when update fails", async () => {
    prismaMocks.categoryUpdate.mockRejectedValue(new Error("not found"));
    const repo = createPrismaAdminRepository();
    const updated = await repo.updateCategory("missing", { name: "Lecture" });
    expect(updated).toBeNull();
  });

  it("deletes category", async () => {
    prismaMocks.count.mockResolvedValue(0);
    prismaMocks.categoryDelete.mockResolvedValue({ id: "lecture" });
    const repo = createPrismaAdminRepository();
    const result = await repo.deleteCategory("lecture");
    expect(result).toBe(true);
  });

  it("returns false when delete fails", async () => {
    prismaMocks.count.mockResolvedValue(0);
    prismaMocks.categoryDelete.mockRejectedValue(new Error("not found"));
    const repo = createPrismaAdminRepository();
    const result = await repo.deleteCategory("missing");
    expect(result).toBe(false);
  });

  it("throws when category in use", async () => {
    prismaMocks.count.mockResolvedValue(2);
    const repo = createPrismaAdminRepository();
    await expect(repo.deleteCategory("lecture")).rejects.toThrow("Category in use");
  });

  it("handles settings", async () => {
    const repo = createPrismaAdminRepository();
    const settings = await repo.getSettings();
    const updated = await repo.updateSettings({
      contactEmail: "a@test",
      contactPhone: "0101",
      homepageIntro: "Intro"
    });
    expect(settings.contactEmail).toBeDefined();
    expect(updated.homepageIntro).toBe("Intro");
  });

  it("lists audiences", async () => {
    prismaMocks.audienceFindMany.mockResolvedValue([
      { id: "all", name: "Tous publics", createdAt: new Date(), updatedAt: new Date() }
    ]);
    const repo = createPrismaAdminRepository();
    const audiences = await repo.listAudiences();
    expect(audiences[0].id).toBe("all");
  });

  it("gets audience by id", async () => {
    prismaMocks.audienceFindUnique.mockResolvedValue({
      id: "all",
      name: "Tous publics",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    const audience = await repo.getAudienceById("all");
    expect(audience?.name).toBe("Tous publics");
  });

  it("returns null when audience not found", async () => {
    prismaMocks.audienceFindUnique.mockResolvedValue(null);
    const repo = createPrismaAdminRepository();
    const audience = await repo.getAudienceById("missing");
    expect(audience).toBeNull();
  });

  it("creates audience", async () => {
    prismaMocks.audienceFindUnique.mockResolvedValue(null);
    prismaMocks.audienceCreate.mockResolvedValue({
      id: "jeunes",
      name: "Jeunes",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    const created = await repo.createAudience({ name: "Jeunes" });
    expect(created.id).toBe("jeunes");
  });

  it("throws when audience name is invalid", async () => {
    const repo = createPrismaAdminRepository();
    await expect(repo.createAudience({ name: "" })).rejects.toThrow("Audience name is invalid");
  });

  it("throws when audience already exists", async () => {
    prismaMocks.audienceFindUnique.mockResolvedValue({
      id: "jeunes",
      name: "Jeunes",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    await expect(repo.createAudience({ name: "Jeunes" })).rejects.toThrow("Audience already exists");
  });

  it("updates audience", async () => {
    prismaMocks.audienceUpdate.mockResolvedValue({
      id: "jeunes",
      name: "Jeunes",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const repo = createPrismaAdminRepository();
    const updated = await repo.updateAudience("jeunes", { name: "Jeunes" });
    expect(updated?.id).toBe("jeunes");
  });

  it("returns null when audience update fails", async () => {
    prismaMocks.audienceUpdate.mockRejectedValue(new Error("not found"));
    const repo = createPrismaAdminRepository();
    const updated = await repo.updateAudience("missing", { name: "Jeunes" });
    expect(updated).toBeNull();
  });

  it("deletes audience", async () => {
    prismaMocks.count.mockResolvedValue(0);
    prismaMocks.audienceDelete.mockResolvedValue({ id: "jeunes" });
    const repo = createPrismaAdminRepository();
    const result = await repo.deleteAudience("jeunes");
    expect(result).toBe(true);
  });

  it("returns false when audience delete fails", async () => {
    prismaMocks.count.mockResolvedValue(0);
    prismaMocks.audienceDelete.mockRejectedValue(new Error("not found"));
    const repo = createPrismaAdminRepository();
    const result = await repo.deleteAudience("missing");
    expect(result).toBe(false);
  });

  it("throws when audience is in use", async () => {
    prismaMocks.count.mockResolvedValue(2);
    const repo = createPrismaAdminRepository();
    await expect(repo.deleteAudience("jeunes")).rejects.toThrow("Audience in use");
  });
});
