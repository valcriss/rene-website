import { computed, ref } from "vue";

type Role = "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN";

const STORAGE_KEY = "rene-auth-role";

const loadRole = (): Role => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "EDITOR" || stored === "MODERATOR" || stored === "ADMIN") {
    return stored;
  }
  return "VISITOR";
};

export const useAuth = () => {
  const role = ref<Role>(loadRole());
  const email = ref("");
  const password = ref("");

  const isAuthenticated = computed(() => role.value !== "VISITOR");

  const login = (nextRole: Role) => {
    role.value = nextRole;
    window.localStorage.setItem(STORAGE_KEY, nextRole);
  };

  const logout = () => {
    role.value = "VISITOR";
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const resetCredentials = () => {
    email.value = "";
    password.value = "";
  };

  return {
    role,
    email,
    password,
    isAuthenticated,
    login,
    logout,
    resetCredentials
  };
};
