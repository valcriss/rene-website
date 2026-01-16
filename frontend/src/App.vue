<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useEventsStore } from "./stores/events";
import { useEditorStore } from "./stores/editor";
import { useAdminStore } from "./stores/admin";

const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
const eventsStore = useEventsStore();
const editorStore = useEditorStore();
const adminStore = useAdminStore();

watch(
  [() => route.path, () => authStore.isAuthenticated],
  ([path, authenticated]) => {
    if (path === "/login" && authenticated) {
      router.replace("/backoffice");
      return;
    }
    if (path.startsWith("/backoffice") && !authenticated) {
      router.replace("/login");
    }
  },
  { immediate: true }
);

watch(
  () => authStore.role,
  (nextRole) => {
    if (nextRole === "ADMIN") {
      adminStore.loadAdminData();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await eventsStore.fetchEvents();
});

defineExpose({
  handlePublish: eventsStore.handlePublish,
  handleReject: eventsStore.handleReject,
  setRole: authStore.setRole,
  setRejectionReason: eventsStore.setRejectionReason,
  getModerationError: eventsStore.getModerationError,
  resetEditorForm: editorStore.resetEditorForm,
  startEdit: editorStore.startEdit,
  handleSaveDraft: editorStore.handleSaveDraft,
  handleSubmitDraft: editorStore.handleSubmitDraft,
  getEditorError: editorStore.getEditorError,
  getEditorFormValues: editorStore.getEditorFormValues,
  resetAdminUserForm: adminStore.resetAdminUserForm,
  resetAdminCategoryForm: adminStore.resetAdminCategoryForm,
  startAdminUserEdit: adminStore.startAdminUserEdit,
  startAdminCategoryEdit: adminStore.startAdminCategoryEdit,
  handleSaveAdminUser: adminStore.handleSaveAdminUser,
  handleSaveAdminCategory: adminStore.handleSaveAdminCategory,
  handleDeleteAdminUser: adminStore.handleDeleteAdminUser,
  handleDeleteAdminCategory: adminStore.handleDeleteAdminCategory,
  handleSaveAdminSettings: adminStore.handleSaveAdminSettings,
  getAdminError: adminStore.getAdminError
});
</script>
