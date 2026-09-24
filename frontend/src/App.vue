<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { onServerPrefetch, watch } from "vue";
import { useHead } from "@unhead/vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useEventsStore } from "./stores/events";
import { useEditorStore } from "./stores/editor";
import { useAdminStore } from "./stores/admin";
import { setSessionExpiredHandler } from "./api/authHeaders";
import { getCurrentLocale } from "./i18n";

const router = useRouter();
const route = useRoute();

// unhead doesn't reliably keep the template's own `lang="fr"` as the initial value (its default
// takes precedence), so it's set explicitly here; live client-side switches are already handled
// by installI18n's own `document.documentElement.lang` watcher, so this only needs to be correct
// once, at setup time (matching whatever locale actually gets rendered, "fr" during SSR).
useHead({ htmlAttrs: { lang: getCurrentLocale() } });

const authStore = useAuthStore();
const eventsStore = useEventsStore();
const editorStore = useEditorStore();
const adminStore = useAdminStore();

setSessionExpiredHandler(() => {
  void authStore.logout();
});

watch(
  [() => route.path, () => authStore.isAuthenticated, () => authStore.sessionInitialized],
  ([path, authenticated, initialized]) => {
    if (!initialized) return;
    if ((path === "/login" || path === "/signup" || path === "/forgot-password" || path === "/reset-password") && authenticated) {
      router.replace("/backoffice").catch(() => {});
      return;
    }
    if (path.startsWith("/backoffice") && !authenticated) {
      router.replace("/login").catch(() => {});
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

// Re-fetch on every role change (login, logout, role switch in tests) so the store always
// holds the data set the current visitor is allowed to see: the public, published-only list
// for anonymous visitors, or the full backoffice list once authenticated.
watch(
  () => authStore.isAuthenticated,
  () => {
    eventsStore.fetchEvents();
  },
  { immediate: true }
);

// The watch above fires the initial fetch but doesn't expose its promise; SSR needs to await
// it (via onServerPrefetch, a no-op on the client) so the response body includes real events.
onServerPrefetch(() => eventsStore.fetchEvents());

defineExpose({
  handlePublish: eventsStore.handlePublish,
  handleUpdateFeatured: eventsStore.handleUpdateFeatured,
  handleReject: eventsStore.handleReject,
  setRole: authStore.setRole,
  setRejectionReason: eventsStore.setRejectionReason,
  setFeaturedEvent: eventsStore.setFeaturedEvent,
  getModerationError: eventsStore.getModerationError,
  resetEditorForm: editorStore.resetEditorForm,
  startEdit: editorStore.startEdit,
  handleSaveDraft: editorStore.handleSaveDraft,
  handleSaveAndSubmit: editorStore.handleSaveAndSubmit,
  handleSaveAndPublish: editorStore.handleSaveAndPublish,
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
