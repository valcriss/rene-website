import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";
import { useAuthStore } from "../src/stores/auth";
import { useAuth } from "../src/auth/useAuth";

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

  it("signup updates session storage", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            token: "signup-token",
            user: { id: "user-1", name: "Writer", email: "writer@example.com", role: "EDITOR" }
          })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const auth = useAuthStore();
    auth.signupName = "Writer";
    auth.signupEmail = "writer@example.com";
    auth.signupPassword = "secret123";
    auth.signupPasswordConfirmation = "secret123";

    await auth.signupWithPassword();

    expect(auth.role).toBe("EDITOR");
    expect(window.localStorage.getItem("rene-auth-user-email")).toBe("writer@example.com");
    vi.unstubAllGlobals();
  });

  it("resetSignupForm clears signup fields", () => {
    const auth = useAuthStore();
    auth.signupName = "Writer";
    auth.signupEmail = "writer@example.com";
    auth.signupPassword = "secret123";
    auth.signupPasswordConfirmation = "secret123";

    auth.resetSignupForm();

    expect(auth.signupName).toBe("");
    expect(auth.signupEmail).toBe("");
    expect(auth.signupPassword).toBe("");
    expect(auth.signupPasswordConfirmation).toBe("");
  });

  it("useAuth returns the auth store", () => {
    const auth = useAuth();
    auth.login("ADMIN");
    expect(useAuthStore().role).toBe("ADMIN");
  });
});
