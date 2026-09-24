import express from "express";
import request from "supertest";
import { createSubscriptionsRouter } from "../src/subscriptions/routes";
import { CategorySubscriptionRepository } from "../src/subscriptions/repository";
import { AdminRepository } from "../src/admin/repository";
import { authenticateOptional } from "../src/auth/middleware";
import { signUserToken } from "../src/auth/jwt";
import { authHeader } from "./authTestUtils";

const buildAdminRepo = (): AdminRepository =>
  ({
    listCategories: async () => [
      { id: "music", name: "Musique", createdAt: "", updatedAt: "" },
      { id: "theatre", name: "Théâtre", createdAt: "", updatedAt: "" }
    ]
  }) as unknown as AdminRepository;

const buildApp = (subscriptionRepo: CategorySubscriptionRepository) => {
  const app = express();
  app.use(express.json());
  app.use(authenticateOptional);
  app.use("/api/subscriptions", createSubscriptionsRouter(subscriptionRepo, buildAdminRepo()));
  return app;
};

describe("subscriptions routes", () => {
  it("lists the current user's category subscriptions", async () => {
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => ["theatre"],
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .get("/api/subscriptions/categories")
      .set("Authorization", authHeader("MODERATOR", "user-1"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: "music", name: "Musique", subscribed: true },
      { id: "theatre", name: "Théâtre", subscribed: false }
    ]);
  });

  it("uses the valid JWT identity and ignores spoofed identity headers", async () => {
    process.env.JWT_SECRET = "test-secret";
    const tokenResult = signUserToken({ id: "jwt-user", name: "User", email: "user@test", role: "MODERATOR" });
    if (!tokenResult.ok) throw new Error("Token generation failed");

    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: jest.fn(async () => []),
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .get("/api/subscriptions/categories")
      .set("Authorization", `Bearer ${tokenResult.value}`)
      .set("x-user-role", "ADMIN")
      .set("x-user-id", "header-user");

    expect(response.status).toBe(200);
    expect(subscriptionRepo.listUnsubscribedCategoryIds).toHaveBeenCalledWith("jwt-user");
  });

  it("rejects listing with only spoofed identity headers", async () => {
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => [],
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .get("/api/subscriptions/categories")
      .set("x-user-role", "MODERATOR")
      .set("x-user-id", "user-1");

    expect(response.status).toBe(401);
  });

  it("rejects listing for roles other than moderator/admin", async () => {
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => [],
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .get("/api/subscriptions/categories")
      .set("Authorization", authHeader("EDITOR", "user-1"));

    expect(response.status).toBe(403);
  });

  it("updates a category subscription", async () => {
    const setSubscription = jest.fn(async () => undefined);
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => [],
      setSubscription
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .put("/api/subscriptions/categories/music")
      .set("Authorization", authHeader("ADMIN", "user-1"))
      .send({ subscribed: false });

    expect(response.status).toBe(200);
    expect(setSubscription).toHaveBeenCalledWith("user-1", "music", false);
  });

  it("rejects updating with only spoofed identity headers", async () => {
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => [],
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .put("/api/subscriptions/categories/music")
      .set("x-user-role", "ADMIN")
      .set("x-user-id", "user-1")
      .send({ subscribed: false });

    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid subscribed value", async () => {
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => [],
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .put("/api/subscriptions/categories/music")
      .set("Authorization", authHeader("ADMIN", "user-1"))
      .send({ subscribed: "nope" });

    expect(response.status).toBe(400);
  });

  it("returns 500 when the handler throws", async () => {
    const subscriptionRepo: CategorySubscriptionRepository = {
      listUnsubscribedCategoryIds: async () => {
        throw new Error("boom");
      },
      setSubscription: jest.fn(async () => undefined)
    };
    const app = buildApp(subscriptionRepo);

    const response = await request(app)
      .get("/api/subscriptions/categories")
      .set("Authorization", authHeader("ADMIN", "user-1"));

    expect(response.status).toBe(500);
  });
});
