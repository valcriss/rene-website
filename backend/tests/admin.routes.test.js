"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const routes_1 = require("../src/admin/routes");
describe("admin routes", () => {
    it("denies access without role", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get("/api/admin/users");
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication required" });
    });
    it("denies access for non-admin", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get("/api/admin/users").set("x-user-role", "EDITOR");
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Forbidden" });
    });
    it("lists users and categories", async () => {
        const app = (0, app_1.createApp)();
        const usersResponse = await (0, supertest_1.default)(app).get("/api/admin/users").set("x-user-role", "ADMIN");
        const categoriesResponse = await (0, supertest_1.default)(app)
            .get("/api/admin/categories")
            .set("x-user-role", "ADMIN");
        expect(usersResponse.status).toBe(200);
        expect(usersResponse.body.length).toBeGreaterThan(0);
        expect(categoriesResponse.status).toBe(200);
        expect(categoriesResponse.body.length).toBeGreaterThan(0);
    });
    it("lists public categories", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get("/api/categories");
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
    });
    it("creates updates and deletes a user", async () => {
        const app = (0, app_1.createApp)();
        const createResponse = await (0, supertest_1.default)(app)
            .post("/api/admin/users")
            .set("x-user-role", "ADMIN")
            .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });
        expect(createResponse.status).toBe(201);
        const userId = createResponse.body.id;
        const updateResponse = await (0, supertest_1.default)(app)
            .put(`/api/admin/users/${userId}`)
            .set("x-user-role", "ADMIN")
            .send({ name: "Marie Curie", email: "marie@example.com", role: "MODERATOR" });
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.name).toBe("Marie Curie");
        const deleteResponse = await (0, supertest_1.default)(app)
            .delete(`/api/admin/users/${userId}`)
            .set("x-user-role", "ADMIN");
        expect(deleteResponse.status).toBe(204);
    });
    it("returns 404 for missing user", async () => {
        const app = (0, app_1.createApp)();
        const updateResponse = await (0, supertest_1.default)(app)
            .put("/api/admin/users/missing")
            .set("x-user-role", "ADMIN")
            .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });
        const deleteResponse = await (0, supertest_1.default)(app)
            .delete("/api/admin/users/missing")
            .set("x-user-role", "ADMIN");
        expect(updateResponse.status).toBe(404);
        expect(deleteResponse.status).toBe(404);
    });
    it("returns 400 for invalid user payload", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app)
            .post("/api/admin/users")
            .set("x-user-role", "ADMIN")
            .send({});
        expect(response.status).toBe(400);
    });
    it("returns 400 for invalid user update", async () => {
        const app = (0, app_1.createApp)();
        const createResponse = await (0, supertest_1.default)(app)
            .post("/api/admin/users")
            .set("x-user-role", "ADMIN")
            .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });
        const response = await (0, supertest_1.default)(app)
            .put(`/api/admin/users/${createResponse.body.id}`)
            .set("x-user-role", "ADMIN")
            .send({});
        expect(response.status).toBe(400);
    });
    it("creates updates and deletes a category", async () => {
        const app = (0, app_1.createApp)();
        const createResponse = await (0, supertest_1.default)(app)
            .post("/api/admin/categories")
            .set("x-user-role", "ADMIN")
            .send({ name: "Lecture" });
        expect(createResponse.status).toBe(201);
        const categoryId = createResponse.body.id;
        const updateResponse = await (0, supertest_1.default)(app)
            .put(`/api/admin/categories/${categoryId}`)
            .set("x-user-role", "ADMIN")
            .send({ name: "Lecture publique" });
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.name).toBe("Lecture publique");
        const deleteResponse = await (0, supertest_1.default)(app)
            .delete(`/api/admin/categories/${categoryId}`)
            .set("x-user-role", "ADMIN");
        expect(deleteResponse.status).toBe(204);
    });
    it("returns 404 for missing category", async () => {
        const app = (0, app_1.createApp)();
        const updateResponse = await (0, supertest_1.default)(app)
            .put("/api/admin/categories/missing")
            .set("x-user-role", "ADMIN")
            .send({ name: "Lecture" });
        const deleteResponse = await (0, supertest_1.default)(app)
            .delete("/api/admin/categories/missing")
            .set("x-user-role", "ADMIN");
        expect(updateResponse.status).toBe(404);
        expect(deleteResponse.status).toBe(404);
    });
    it("returns 400 for invalid category payload", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app)
            .post("/api/admin/categories")
            .set("x-user-role", "ADMIN")
            .send({});
        expect(response.status).toBe(400);
    });
    it("returns 400 for invalid category update", async () => {
        const app = (0, app_1.createApp)();
        const createResponse = await (0, supertest_1.default)(app)
            .post("/api/admin/categories")
            .set("x-user-role", "ADMIN")
            .send({ name: "Lecture" });
        const response = await (0, supertest_1.default)(app)
            .put(`/api/admin/categories/${createResponse.body.id}`)
            .set("x-user-role", "ADMIN")
            .send({});
        expect(response.status).toBe(400);
    });
    it("returns 409 when category is in use", async () => {
        const repo = {
            deleteCategory: jest.fn(async () => {
                throw new Error("Category in use");
            })
        };
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api/admin", (0, routes_1.createAdminRouter)(repo));
        const response = await (0, supertest_1.default)(app)
            .delete("/api/admin/categories/active")
            .set("x-user-role", "ADMIN");
        expect(response.status).toBe(409);
        expect(response.body).toEqual({ errors: ["Category in use"] });
    });
    it("gets and updates settings", async () => {
        const app = (0, app_1.createApp)();
        const getResponse = await (0, supertest_1.default)(app)
            .get("/api/admin/settings")
            .set("x-user-role", "ADMIN");
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.contactEmail).toBeDefined();
        const updateResponse = await (0, supertest_1.default)(app)
            .put("/api/admin/settings")
            .set("x-user-role", "ADMIN")
            .send({
            contactEmail: "contact@rene-website.test",
            contactPhone: "0102030405",
            homepageIntro: "Bienvenue"
        });
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.homepageIntro).toBe("Bienvenue");
    });
    it("returns 400 for invalid settings", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app)
            .put("/api/admin/settings")
            .set("x-user-role", "ADMIN")
            .send({});
        expect(response.status).toBe(400);
    });
});
