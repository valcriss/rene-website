import { listCategorySubscriptions, setCategorySubscription } from "../src/subscriptions/service";
import { CategorySubscriptionRepository } from "../src/subscriptions/repository";
import { AdminRepository } from "../src/admin/repository";

const actor = { id: "user-1", role: "EDITOR" as const };

const buildAdminRepo = (categories: { id: string; name: string }[]): AdminRepository =>
  ({
    listCategories: async () =>
      categories.map((category) => ({ ...category, createdAt: "", updatedAt: "" }))
  }) as unknown as AdminRepository;

const buildSubscriptionRepo = (unsubscribed: string[]): CategorySubscriptionRepository => ({
  listUnsubscribedCategoryIds: async () => unsubscribed,
  setSubscription: jest.fn(async () => undefined)
});

describe("listCategorySubscriptions", () => {
  it("marks unsubscribed categories accordingly", async () => {
    const adminRepo = buildAdminRepo([
      { id: "music", name: "Musique" },
      { id: "theatre", name: "Théâtre" }
    ]);
    const subscriptionRepo = buildSubscriptionRepo(["theatre"]);

    const result = await listCategorySubscriptions(subscriptionRepo, adminRepo, actor);

    expect(result).toEqual([
      { id: "music", name: "Musique", subscribed: true },
      { id: "theatre", name: "Théâtre", subscribed: false }
    ]);
  });
});

describe("setCategorySubscription", () => {
  it("rejects a non-boolean subscribed value", async () => {
    const subscriptionRepo = buildSubscriptionRepo([]);

    const result = await setCategorySubscription(subscriptionRepo, actor, "music", "yes");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("subscribed doit être un booléen.");
    }
    expect(subscriptionRepo.setSubscription).not.toHaveBeenCalled();
  });

  it("updates the subscription when the value is valid", async () => {
    const subscriptionRepo = buildSubscriptionRepo([]);

    const result = await setCategorySubscription(subscriptionRepo, actor, "music", false);

    expect(result.ok).toBe(true);
    expect(subscriptionRepo.setSubscription).toHaveBeenCalledWith("user-1", "music", false);
  });
});
