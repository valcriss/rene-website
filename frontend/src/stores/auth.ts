import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { login as loginApi } from "../api/auth";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../api/authHeaders";

export type Role = "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN";

const STORAGE_KEY = "rene-auth-role";
const USER_NAME_KEY = "rene-auth-user-name";
const USER_EMAIL_KEY = "rene-auth-user-email";

const loadRole = (): Role => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "EDITOR" || stored === "MODERATOR" || stored === "ADMIN") {
    return stored;
  }
  return "VISITOR";
};

const loadToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);
const loadUserId = () => window.localStorage.getItem(USER_ID_STORAGE_KEY);
const loadUserName = () => window.localStorage.getItem(USER_NAME_KEY) ?? "";
const loadUserEmail = () => window.localStorage.getItem(USER_EMAIL_KEY) ?? "";

export const useAuthStore = defineStore("auth", () => {
  const role = ref<Role>(loadRole());
  const token = ref<string | null>(loadToken());
  const userId = ref<string | null>(loadUserId());
  const userName = ref(loadUserName());
  const userEmail = ref(loadUserEmail());
  const email = ref("");
  const password = ref("");
  const authError = ref<string | null>(null);

  const isAuthenticated = computed(() => role.value !== "VISITOR");
  const canModerate = computed(() => role.value === "MODERATOR" || role.value === "ADMIN");
  const canEdit = computed(() => role.value === "EDITOR" || canModerate.value);
  const isAdmin = computed(() => role.value === "ADMIN");

  const login = (nextRole: Role) => {
    role.value = nextRole;
    window.localStorage.setItem(STORAGE_KEY, nextRole);
  };

  const setSession = (payload: { token: string; user: { id: string; name: string; email: string; role: Role } }) => {
    role.value = payload.user.role;
    token.value = payload.token;
    userId.value = payload.user.id;
    userName.value = payload.user.name;
    userEmail.value = payload.user.email;
    window.localStorage.setItem(STORAGE_KEY, payload.user.role);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    window.localStorage.setItem(USER_ID_STORAGE_KEY, payload.user.id);
    window.localStorage.setItem(USER_NAME_KEY, payload.user.name);
    window.localStorage.setItem(USER_EMAIL_KEY, payload.user.email);
  };

  const loginWithPassword = async () => {
    authError.value = null;
    const result = await loginApi(email.value, password.value);
    setSession(result);
  };

  const setRole = (nextRole: Role) => {
    login(nextRole);
  };

  const logout = () => {
    role.value = "VISITOR";
    token.value = null;
    userId.value = null;
    userName.value = "";
    userEmail.value = "";
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(USER_NAME_KEY);
    window.localStorage.removeItem(USER_EMAIL_KEY);
  };

  const resetCredentials = () => {
    email.value = "";
    password.value = "";
  };

  return {
    role,
    token,
    userId,
    userName,
    userEmail,
    email,
    password,
    authError,
    isAuthenticated,
    canModerate,
    canEdit,
    isAdmin,
    login,
    loginWithPassword,
    setRole,
    logout,
    resetCredentials
  };
});
