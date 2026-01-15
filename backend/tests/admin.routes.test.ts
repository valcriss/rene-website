import request from "supertest";
import { createApp } from "../src/app";

describe("admin routes", () => {
  it("denies access without role", async () => {
    const app = createApp();
    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authentication required" });
  });

  it("denies access for non-admin", async () => {
    const app = createApp();
    const response = await request(app).get("/api/admin/users").set("x-user-role", "EDITOR");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Forbidden" });
  });

  it("lists users and categories", async () => {
    const app = createApp();
    const usersResponse = await request(app).get("/api/admin/users").set("x-user-role", "ADMIN");
    const categoriesResponse = await request(app)
      .get("/api/admin/categories")
      .set("x-user-role", "ADMIN");

    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.length).toBeGreaterThan(0);
    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body.length).toBeGreaterThan(0);
  });

  it("creates updates and deletes a user", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/admin/users")
      .set("x-user-role", "ADMIN")
      .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });

    expect(createResponse.status).toBe(201);
    const userId = createResponse.body.id;

    const updateResponse = await request(app)
      .put(`/api/admin/users/${userId}`)
      .set("x-user-role", "ADMIN")
      .send({ name: "Marie Curie", email: "marie@example.com", role: "MODERATOR" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe("Marie Curie");

    const deleteResponse = await request(app)
      .delete(`/api/admin/users/${userId}`)
      .set("x-user-role", "ADMIN");

    expect(deleteResponse.status).toBe(204);
  });

  it("returns 404 for missing user", async () => {
    const app = createApp();
    const updateResponse = await request(app)
      .put("/api/admin/users/missing")
      .set("x-user-role", "ADMIN")
      .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });
    const deleteResponse = await request(app)
      .delete("/api/admin/users/missing")
      .set("x-user-role", "ADMIN");

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it("returns 400 for invalid user payload", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/admin/users")
      .set("x-user-role", "ADMIN")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid user update", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/admin/users")
      .set("x-user-role", "ADMIN")
      .send({ name: "Marie", email: "marie@example.com", role: "EDITOR" });

    const response = await request(app)
      .put(`/api/admin/users/${createResponse.body.id}`)
      .set("x-user-role", "ADMIN")
      .send({});

    expect(response.status).toBe(400);
  });

  it("creates updates and deletes a category", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/admin/categories")
      .set("x-user-role", "ADMIN")
      .send({ name: "Lecture" });

    expect(createResponse.status).toBe(201);
    const categoryId = createResponse.body.id;

    const updateResponse = await request(app)
      .put(`/api/admin/categories/${categoryId}`)
      .set("x-user-role", "ADMIN")
      .send({ name: "Lecture publique" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe("Lecture publique");

    const deleteResponse = await request(app)
      .delete(`/api/admin/categories/${categoryId}`)
      .set("x-user-role", "ADMIN");

    expect(deleteResponse.status).toBe(204);
  });

  it("returns 404 for missing category", async () => {
    const app = createApp();
    const updateResponse = await request(app)
      .put("/api/admin/categories/missing")
      .set("x-user-role", "ADMIN")
      .send({ name: "Lecture" });
    const deleteResponse = await request(app)
      .delete("/api/admin/categories/missing")
      .set("x-user-role", "ADMIN");

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it("returns 400 for invalid category payload", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/admin/categories")
      .set("x-user-role", "ADMIN")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid category update", async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post("/api/admin/categories")
      .set("x-user-role", "ADMIN")
      .send({ name: "Lecture" });

    const response = await request(app)
      .put(`/api/admin/categories/${createResponse.body.id}`)
      .set("x-user-role", "ADMIN")
      .send({});

    expect(response.status).toBe(400);
  });

  it("gets and updates settings", async () => {
    const app = createApp();
    const getResponse = await request(app)
      .get("/api/admin/settings")
      .set("x-user-role", "ADMIN");

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.contactEmail).toBeDefined();

    const updateResponse = await request(app)
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
    const app = createApp();
    const response = await request(app)
      .put("/api/admin/settings")
      .set("x-user-role", "ADMIN")
      .send({});

    expect(response.status).toBe(400);
  });
});