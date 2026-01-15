import { describe, it, expect } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createAppRouter } from "../src/router";

describe("router", () => {
  it("creates routes for home, login, and backoffice", () => {
    const router = createAppRouter(createMemoryHistory());
    const paths = router.getRoutes().map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining(["/", "/login", "/backoffice", "/event/:id"]));
  });
});
