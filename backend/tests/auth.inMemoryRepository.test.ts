import { createInMemoryAuthRepository } from "../src/auth/inMemoryRepository";

describe("inMemoryAuthRepository", () => {
  it("returns empty results", async () => {
    const repo = createInMemoryAuthRepository();

    expect(await repo.getUserByEmail("x@test")).toBeNull();
    expect(await repo.getUserById("id")).toBeNull();
    expect(await repo.listUsersByRole(["ADMIN"])).toEqual([]);
  });
});
