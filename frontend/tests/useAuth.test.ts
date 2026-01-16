import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "../src/stores/auth";

const setupStorage = () => {
  window.localStorage.clear();
};

describe("useAuth", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setupStorage();
  });

  it("defaults to visitor", () => {
    const auth = useAuthStore();
    expect(auth.role).toBe("VISITOR");
    expect(auth.isAuthenticated).toBe(false);
  });

  it("loads stored role", () => {
    window.localStorage.setItem("rene-auth-role", "ADMIN");
    const auth = useAuthStore();
    expect(auth.role).toBe("ADMIN");
    expect(auth.isAuthenticated).toBe(true);
  });

  it("login updates storage", () => {
    const auth = useAuthStore();
    auth.login("MODERATOR");
    expect(window.localStorage.getItem("rene-auth-role")).toBe("MODERATOR");
  });

  it("logout clears storage", () => {
    const auth = useAuthStore();
    auth.login("EDITOR");
    auth.logout();
    expect(auth.role).toBe("VISITOR");
    expect(window.localStorage.getItem("rene-auth-role")).toBeNull();
  });

  it("resetCredentials clears fields", () => {
    const auth = useAuthStore();
    auth.email = "test@example.com";
    auth.password = "secret";
    auth.resetCredentials();
    expect(auth.email).toBe("");
    expect(auth.password).toBe("");
  });
});
