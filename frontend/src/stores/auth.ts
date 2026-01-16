import { computed, ref } from "vue";
import { defineStore } from "pinia";

export type Role = "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN";

const STORAGE_KEY = "rene-auth-role";

const loadRole = (): Role => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "EDITOR" || stored === "MODERATOR" || stored === "ADMIN") {
    return stored;
  }
  return "VISITOR";
};

export const useAuthStore = defineStore("auth", () => {
  const role = ref<Role>(loadRole());
  const email = ref("");
  const password = ref("");

  const isAuthenticated = computed(() => role.value !== "VISITOR");
  const canModerate = computed(() => role.value === "MODERATOR" || role.value === "ADMIN");
  const canEdit = computed(() => role.value === "EDITOR" || canModerate.value);
  const isAdmin = computed(() => role.value === "ADMIN");

  const login = (nextRole: Role) => {
    role.value = nextRole;
    window.localStorage.setItem(STORAGE_KEY, nextRole);
  };

  const setRole = (nextRole: Role) => {
    login(nextRole);
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
    canModerate,
    canEdit,
    isAdmin,
    login,
    setRole,
    logout,
    resetCredentials
  };
});
