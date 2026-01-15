import { useAuth } from "../src/auth/useAuth";

const setupStorage = () => {
  window.localStorage.clear();
};

describe("useAuth", () => {
  beforeEach(() => {
    setupStorage();
  });

  it("defaults to visitor", () => {
    const auth = useAuth();
    expect(auth.role.value).toBe("VISITOR");
    expect(auth.isAuthenticated.value).toBe(false);
  });

  it("loads stored role", () => {
    window.localStorage.setItem("rene-auth-role", "ADMIN");
    const auth = useAuth();
    expect(auth.role.value).toBe("ADMIN");
    expect(auth.isAuthenticated.value).toBe(true);
  });

  it("login updates storage", () => {
    const auth = useAuth();
    auth.login("MODERATOR");
    expect(window.localStorage.getItem("rene-auth-role")).toBe("MODERATOR");
  });

  it("logout clears storage", () => {
    const auth = useAuth();
    auth.login("EDITOR");
    auth.logout();
    expect(auth.role.value).toBe("VISITOR");
    expect(window.localStorage.getItem("rene-auth-role")).toBeNull();
  });

  it("resetCredentials clears fields", () => {
    const auth = useAuth();
    auth.email.value = "test@example.com";
    auth.password.value = "secret";
    auth.resetCredentials();
    expect(auth.email.value).toBe("");
    expect(auth.password.value).toBe("");
  });
});
