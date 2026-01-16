<template>
  <NavigationHeader title="Backoffice" tagline="Espace professionnel" :show-login="false" />

  <section class="mx-auto max-w-7xl px-6 py-12">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Backoffice</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900">Tableau de bord</h1>
        <p class="mt-1 text-sm text-slate-500">Rôle actif : {{ role }}</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          v-if="isAuthenticated"
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="handleLogout"
        >
          Se déconnecter
        </button>
      </div>
    </div>

    <nav class="mt-6 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
      <button
        type="button"
        class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
        @click="goToHome"
      >
        Retour au site
      </button>
      <RouterLink
        v-if="canEdit"
        to="/backoffice/events"
        class="rounded-full px-4 py-2 text-sm"
        :class="navClasses(isEventsRoute)"
      >
        Mes événements
      </RouterLink>
      <RouterLink
        v-if="canModerate"
        to="/backoffice/moderation"
        class="rounded-full px-4 py-2 text-sm"
        :class="navClasses(isModerationRoute)"
      >
        Modération
      </RouterLink>
      <RouterLink
        v-if="isAdmin"
        to="/backoffice/admin/users"
        class="rounded-full px-4 py-2 text-sm"
        :class="navClasses(isAdminRoute)"
      >
        Administration
      </RouterLink>
    </nav>

    <div v-if="!isAuthenticated" class="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 class="text-xl font-medium text-slate-900">Connexion requise</h2>
      <p class="mt-2 text-sm text-slate-500">
        Connectez-vous pour accéder aux outils de rédaction, modération ou administration.
      </p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        @click="goToLogin"
      >
        Se connecter
      </button>
    </div>

    <div v-else class="mt-8">
      <div
        v-if="isAdminRoute"
        class="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
      >
        <RouterLink
          to="/backoffice/admin/users"
          class="rounded-full px-4 py-2 text-sm"
          :class="subNavClasses(isAdminUsersRoute)"
        >
          Utilisateurs
        </RouterLink>
        <RouterLink
          to="/backoffice/admin/categories"
          class="rounded-full px-4 py-2 text-sm"
          :class="subNavClasses(isAdminCategoriesRoute)"
        >
          Catégories
        </RouterLink>
        <RouterLink
          to="/backoffice/admin/settings"
          class="rounded-full px-4 py-2 text-sm"
          :class="subNavClasses(isAdminSettingsRoute)"
        >
          Réglages
        </RouterLink>
      </div>

      <RouterView />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../../components/navigation/Header.vue";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { role, isAuthenticated, canEdit, canModerate, isAdmin } = storeToRefs(authStore);

const isEventsRoute = computed(() => route.path.startsWith("/backoffice/events"));
const isModerationRoute = computed(() => route.path.startsWith("/backoffice/moderation"));
const isAdminRoute = computed(() => route.path.startsWith("/backoffice/admin"));
const isAdminUsersRoute = computed(() => route.path.endsWith("/admin/users"));
const isAdminCategoriesRoute = computed(() => route.path.endsWith("/admin/categories"));
const isAdminSettingsRoute = computed(() => route.path.endsWith("/admin/settings"));

const navClasses = (active: boolean) =>
  active
    ? "bg-slate-900 text-white"
    : "border border-slate-200 text-slate-600";

const subNavClasses = (active: boolean) =>
  active
    ? "bg-slate-900 text-white"
    : "border border-slate-200 text-slate-600";

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

const goToHome = () => {
  router.push("/");
};

const goToLogin = () => {
  router.push("/login");
};
</script>
