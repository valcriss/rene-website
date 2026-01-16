import { describe, it, expect } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createAppRouter } from "../src/router";

describe("router", () => {
  it("creates routes for home, login, and backoffice", () => {
    const router = createAppRouter(createMemoryHistory());
    const paths = router.getRoutes().map((route) => route.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/login",
        "/backoffice",
        "/backoffice/events",
        "/backoffice/events/new",
        "/backoffice/moderation",
        "/backoffice/moderation/view/:id",
        "/backoffice/admin",
        "/backoffice/admin/users",
        "/backoffice/admin/categories",
        "/backoffice/admin/settings",
        "/event/:id"
      ])
    );
  });
});
