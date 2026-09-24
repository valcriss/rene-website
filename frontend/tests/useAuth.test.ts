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
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })));
  });

  it("defaults to visitor", () => {
    const auth = useAuthStore();
    expect(auth.role).toBe("VISITOR");
    expect(auth.isAuthenticated).toBe(false);
  });

  it("ignores forged roles from Web Storage", () => {
    window.localStorage.setItem("rene-auth-role", "ADMIN");
    const auth = useAuthStore();
    expect(auth.role).toBe("VISITOR");
    expect(auth.isAuthenticated).toBe(false);
  });

  it("login never writes credentials to storage", () => {
    const auth = useAuthStore();
    auth.login("MODERATOR");
    expect(window.localStorage.length).toBe(0);
  });

  it("logout clears storage", async () => {
    const auth = useAuthStore();
    auth.login("EDITOR");
    await auth.logout();
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

  it("signup waits for email verification before creating a session", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
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

    expect(auth.role).toBe("VISITOR");
    expect(auth.userEmail).toBe("");
    expect(auth.signupVerificationSent).toBe(true);
    expect(window.localStorage.length).toBe(0);
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
    expect(auth.signupVerificationSent).toBe(false);
  });

  it("requests a password reset", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    vi.stubGlobal("fetch", fetchMock);

    const auth = useAuthStore();
    auth.passwordResetEmail = "writer@example.com";

    await auth.requestPasswordResetWithEmail();

    expect(auth.passwordResetRequestSent).toBe(true);
    vi.unstubAllGlobals();
  });

  it("resetPasswordResetForm clears reset fields", () => {
    const auth = useAuthStore();
    auth.passwordResetToken = "token";
    auth.passwordResetNewPassword = "secret123";
    auth.passwordResetPasswordConfirmation = "secret123";
    auth.passwordResetComplete = true;

    auth.resetPasswordResetForm();

    expect(auth.passwordResetToken).toBe("");
    expect(auth.passwordResetNewPassword).toBe("");
    expect(auth.passwordResetPasswordConfirmation).toBe("");
    expect(auth.passwordResetComplete).toBe(false);
  });

  it("useAuth returns the auth store", () => {
    const auth = useAuth();
    auth.login("ADMIN");
    expect(useAuthStore().role).toBe("ADMIN");
  });

  it("restores a server session and marks initialization complete", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        user: { id: "user-1", name: "Writer", email: "writer@test", role: "EDITOR" }
      })
    })));
    const auth = useAuthStore();
    await auth.restoreSession();
    expect(auth).toMatchObject({ role: "EDITOR", userId: "user-1", sessionInitialized: true });
  });

  it("falls back to a visitor when session restoration or server logout fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    const auth = useAuthStore();
    auth.login("ADMIN");
    await auth.restoreSession();
    expect(auth.role).toBe("VISITOR");
    expect(auth.sessionInitialized).toBe(true);
    auth.login("EDITOR");
    await expect(auth.logout()).resolves.toBeUndefined();
    expect(auth.role).toBe("VISITOR");
  });
});
