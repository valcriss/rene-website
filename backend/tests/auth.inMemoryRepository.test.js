"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inMemoryRepository_1 = require("../src/auth/inMemoryRepository");
describe("inMemoryAuthRepository", () => {
    it("returns empty results", async () => {
        const repo = (0, inMemoryRepository_1.createInMemoryAuthRepository)();
        expect(await repo.getUserByEmail("x@test")).toBeNull();
        expect(await repo.getUserById("id")).toBeNull();
        expect(await repo.listUsersByRole(["ADMIN"])).toEqual([]);
    });
});
