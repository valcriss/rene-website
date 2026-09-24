import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  login as loginApi,
  getSession as getSessionApi,
  logout as logoutApi,
  requestPasswordReset as requestPasswordResetApi,
  resetPassword as resetPasswordApi,
  signup as signupApi,
  verifyEmail as verifyEmailApi
} from "../api/auth";

export type Role = "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN";

export const useAuthStore = defineStore("auth", () => {
  const role = ref<Role>("VISITOR");
  const userId = ref<string | null>(null);
  const userName = ref("");
  const userEmail = ref("");
  const sessionInitialized = ref(false);
  const email = ref("");
  const password = ref("");
  const signupName = ref("");
  const signupEmail = ref("");
  const signupPassword = ref("");
  const signupPasswordConfirmation = ref("");
  const signupVerificationSent = ref(false);
  const authError = ref<string | null>(null);
  const passwordResetEmail = ref("");
  const passwordResetToken = ref("");
  const passwordResetNewPassword = ref("");
  const passwordResetPasswordConfirmation = ref("");
  const passwordResetError = ref<string | null>(null);
  const passwordResetRequestSent = ref(false);
  const passwordResetComplete = ref(false);

  const isAuthenticated = computed(() => role.value !== "VISITOR");
  const canModerate = computed(() => role.value === "MODERATOR" || role.value === "ADMIN");
  const canEdit = computed(() => role.value === "EDITOR" || canModerate.value);
  const isAdmin = computed(() => role.value === "ADMIN");

  const login = (nextRole: Role) => {
    role.value = nextRole;
  };

  const setSession = (payload: { user: { id: string; name: string; email: string; role: Role } }) => {
    role.value = payload.user.role;
    userId.value = payload.user.id;
    userName.value = payload.user.name;
    userEmail.value = payload.user.email;
  };

  const clearSession = () => {
    role.value = "VISITOR";
    userId.value = null;
    userName.value = "";
    userEmail.value = "";
  };

  const restoreSession = async () => {
    try {
      const session = await getSessionApi();
      if (session) setSession(session);
      else clearSession();
    } catch {
      clearSession();
    } finally {
      sessionInitialized.value = true;
    }
  };

  const loginWithPassword = async () => {
    authError.value = null;
    const result = await loginApi(email.value, password.value);
    setSession(result);
  };

  const signupWithPassword = async () => {
    authError.value = null;
    await signupApi({
      name: signupName.value,
      email: signupEmail.value,
      password: signupPassword.value,
      passwordConfirmation: signupPasswordConfirmation.value
    });
    signupVerificationSent.value = true;
  };

  const requestPasswordResetWithEmail = async () => {
    passwordResetError.value = null;
    passwordResetRequestSent.value = false;
    await requestPasswordResetApi(passwordResetEmail.value);
    passwordResetRequestSent.value = true;
  };

  const confirmPasswordReset = async () => {
    passwordResetError.value = null;
    passwordResetComplete.value = false;
    await resetPasswordApi({
      token: passwordResetToken.value,
      password: passwordResetNewPassword.value,
      passwordConfirmation: passwordResetPasswordConfirmation.value
    });
    passwordResetComplete.value = true;
  };

  const verifyEmailAddress = async (token: string) => {
    await verifyEmailApi({ token });
  };

  const setRole = (nextRole: Role) => {
    login(nextRole);
  };

  const logout = async () => {
    clearSession();
    try {
      await logoutApi();
    } catch {
      // Local state must still be cleared if the server is temporarily unreachable.
    }
  };

  const resetCredentials = () => {
    email.value = "";
    password.value = "";
  };

  const resetSignupForm = () => {
    signupName.value = "";
    signupEmail.value = "";
    signupPassword.value = "";
    signupPasswordConfirmation.value = "";
    signupVerificationSent.value = false;
  };

  const resetPasswordResetRequestForm = () => {
    passwordResetEmail.value = "";
    passwordResetError.value = null;
    passwordResetRequestSent.value = false;
  };

  const resetPasswordResetForm = () => {
    passwordResetToken.value = "";
    passwordResetNewPassword.value = "";
    passwordResetPasswordConfirmation.value = "";
    passwordResetError.value = null;
    passwordResetComplete.value = false;
  };

  return {
    role,
    userId,
    userName,
    userEmail,
    sessionInitialized,
    email,
    password,
    signupName,
    signupEmail,
    signupPassword,
    signupPasswordConfirmation,
    signupVerificationSent,
    authError,
    passwordResetEmail,
    passwordResetToken,
    passwordResetNewPassword,
    passwordResetPasswordConfirmation,
    passwordResetError,
    passwordResetRequestSent,
    passwordResetComplete,
    isAuthenticated,
    canModerate,
    canEdit,
    isAdmin,
    login,
    loginWithPassword,
    signupWithPassword,
    requestPasswordResetWithEmail,
    confirmPasswordReset,
    verifyEmailAddress,
    setRole,
    restoreSession,
    logout,
    resetCredentials,
    resetSignupForm,
    resetPasswordResetRequestForm,
    resetPasswordResetForm
  };
});
