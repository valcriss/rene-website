import { reactive, ref } from "vue";
import { defineStore } from "pinia";
import {
  AdminCategory,
  AdminSettings,
  AdminUser,
  createAdminCategory,
  createAdminUser,
  deleteAdminCategory,
  deleteAdminUser,
  fetchAdminCategories,
  fetchAdminSettings,
  fetchAdminUsers,
  updateAdminCategory,
  updateAdminSettings,
  updateAdminUser
} from "../api/admin";
import { useAuthStore } from "./auth";

export const useAdminStore = defineStore("admin", () => {
  const adminUsers = ref<AdminUser[]>([]);
  const adminCategories = ref<AdminCategory[]>([]);
  const adminSettings = ref<AdminSettings | null>(null);
  const adminError = ref<string | null>(null);
  const adminLoading = ref(false);

  const adminUserEditingId = ref<string | null>(null);
  const adminCategoryEditingId = ref<string | null>(null);
  const adminUserForm = reactive({
    name: "",
    email: "",
    role: "EDITOR" as AdminUser["role"]
  });
  const adminCategoryForm = reactive({
    name: ""
  });
  const adminSettingsForm = reactive({
    contactEmail: "",
    contactPhone: "",
    homepageIntro: ""
  });

  const resetAdminUserForm = () => {
    adminUserEditingId.value = null;
    adminUserForm.name = "";
    adminUserForm.email = "";
    adminUserForm.role = "EDITOR";
  };

  const resetAdminCategoryForm = () => {
    adminCategoryEditingId.value = null;
    adminCategoryForm.name = "";
  };

  const startAdminUserEdit = (user: AdminUser) => {
    adminUserEditingId.value = user.id;
    adminUserForm.name = user.name;
    adminUserForm.email = user.email;
    adminUserForm.role = user.role;
  };

  const startAdminCategoryEdit = (category: AdminCategory) => {
    adminCategoryEditingId.value = category.id;
    adminCategoryForm.name = category.name;
  };

  const handleSaveAdminUser = async () => {
    adminError.value = null;
    const authStore = useAuthStore();
    if (!authStore.isAdmin) return;
    try {
      const payload = {
        name: adminUserForm.name,
        email: adminUserForm.email,
        role: adminUserForm.role
      };
      const updated = adminUserEditingId.value
        ? await updateAdminUser(authStore.role, adminUserEditingId.value, payload)
        : await createAdminUser(authStore.role, payload);
      adminUsers.value = [updated, ...adminUsers.value.filter((user) => user.id !== updated.id)];
      resetAdminUserForm();
    } catch (err) {
      adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleDeleteAdminUser = async (id: string) => {
    adminError.value = null;
    const authStore = useAuthStore();
    if (!authStore.isAdmin) return;
    try {
      await deleteAdminUser(authStore.role, id);
      adminUsers.value = adminUsers.value.filter((user) => user.id !== id);
      if (adminUserEditingId.value === id) {
        resetAdminUserForm();
      }
    } catch (err) {
      adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleSaveAdminCategory = async () => {
    adminError.value = null;
    const authStore = useAuthStore();
    if (!authStore.isAdmin) return;
    try {
      const payload = { name: adminCategoryForm.name };
      const updated = adminCategoryEditingId.value
        ? await updateAdminCategory(authStore.role, adminCategoryEditingId.value, payload)
        : await createAdminCategory(authStore.role, payload);
      adminCategories.value = [
        updated,
        ...adminCategories.value.filter((category) => category.id !== updated.id)
      ];
      resetAdminCategoryForm();
    } catch (err) {
      adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleDeleteAdminCategory = async (id: string) => {
    adminError.value = null;
    const authStore = useAuthStore();
    if (!authStore.isAdmin) return;
    try {
      await deleteAdminCategory(authStore.role, id);
      adminCategories.value = adminCategories.value.filter((category) => category.id !== id);
      if (adminCategoryEditingId.value === id) {
        resetAdminCategoryForm();
      }
    } catch (err) {
      adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleSaveAdminSettings = async () => {
    adminError.value = null;
    const authStore = useAuthStore();
    if (!authStore.isAdmin) return;
    try {
      const updated = await updateAdminSettings(authStore.role, { ...adminSettingsForm });
      adminSettings.value = updated;
    } catch (err) {
      adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const loadAdminData = async () => {
    adminError.value = null;
    adminLoading.value = true;
    const authStore = useAuthStore();
    try {
      const [users, categories, settings] = await Promise.all([
        fetchAdminUsers(authStore.role),
        fetchAdminCategories(authStore.role),
        fetchAdminSettings(authStore.role)
      ]);
      adminUsers.value = users;
      adminCategories.value = categories;
      adminSettings.value = settings;
      adminSettingsForm.contactEmail = settings.contactEmail;
      adminSettingsForm.contactPhone = settings.contactPhone;
      adminSettingsForm.homepageIntro = settings.homepageIntro;
    } catch (err) {
      adminError.value = err instanceof Error ? err.message : "Erreur inconnue";
    } finally {
      adminLoading.value = false;
    }
  };

  const getAdminError = () => adminError.value;

  return {
    adminUsers,
    adminCategories,
    adminSettings,
    adminError,
    adminLoading,
    adminUserEditingId,
    adminCategoryEditingId,
    adminUserForm,
    adminCategoryForm,
    adminSettingsForm,
    resetAdminUserForm,
    resetAdminCategoryForm,
    startAdminUserEdit,
    startAdminCategoryEdit,
    handleSaveAdminUser,
    handleDeleteAdminUser,
    handleSaveAdminCategory,
    handleDeleteAdminCategory,
    handleSaveAdminSettings,
    loadAdminData,
    getAdminError
  };
});
