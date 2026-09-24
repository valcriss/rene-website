// @vitest-environment node
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "../src/stores/auth";
import { buildAuthHeaders } from "../src/api/authHeaders";

// This file intentionally runs under the plain Node environment (no window/localStorage at
// all), matching what SSR rendering actually sees, unlike every other test file which runs
// under jsdom and would never exercise these guards' "no window" branch.
describe("auth persistence without a window (SSR)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("defaults to an anonymous VISITOR session", () => {
    const store = useAuthStore();

    expect(store.role).toBe("VISITOR");
    expect(store.token).toBeNull();
    expect(store.userId).toBeNull();
    expect(store.userName).toBe("");
    expect(store.userEmail).toBe("");
    expect(store.isAuthenticated).toBe(false);
  });

  it("login and logout mutate in-memory state without throwing", () => {
    const store = useAuthStore();

    expect(() => store.login("EDITOR")).not.toThrow();
    expect(store.role).toBe("EDITOR");

    expect(() => store.logout()).not.toThrow();
    expect(store.role).toBe("VISITOR");
    expect(store.token).toBeNull();
  });

  it("buildAuthHeaders omits Authorization when there is no persisted token", () => {
    const headers = buildAuthHeaders("EDITOR");

    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBeUndefined();
  });
});
