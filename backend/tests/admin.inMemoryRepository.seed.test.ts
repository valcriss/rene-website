describe("admin in-memory repository seeding", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("falls back to random id when slug is empty during seed", async () => {
    jest.doMock("../src/admin/slug", () => ({
      slugifyCategoryId: () => ""
    }));

    const { createInMemoryAdminRepository } = await import("../src/admin/inMemoryRepository");
    const repo = createInMemoryAdminRepository();
    const categories = await repo.listCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0].id).not.toBe("");
  });
});
