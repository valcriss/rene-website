<template>
  <NavigationHeader title="Backoffice" tagline="Espace professionnel" :show-login="false" />

  <section class="relative overflow-hidden">
    <div class="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(186,230,253,0.5),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(224,242,254,0.7),_transparent_42%)]"></div>

    <div class="relative mx-auto max-w-[92rem] px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div class="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside class="space-y-4">
          <div class="rounded-[2rem] border border-sky-100 bg-white/95 p-6 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.28)] backdrop-blur">
            <p class="text-xs uppercase tracking-[0.32em] text-sky-700/70">Espace pro</p>
            <h1 class="mt-3 text-2xl font-semibold text-slate-950">Backoffice</h1>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              Navigation stable, vues métier dédiées et actions clés toujours accessibles.
            </p>

            <div class="mt-5 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
              <p class="text-[11px] uppercase tracking-[0.28em] text-slate-500">Rôle actif</p>
              <p class="mt-2 text-sm font-semibold text-slate-900">{{ roleLabels[role] }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ sectionDescription }}</p>
            </div>

            <nav class="mt-5 grid gap-2">
              <RouterLink
                v-if="canEdit"
                to="/backoffice/events"
                class="rounded-2xl border px-4 py-3 text-sm transition"
                :class="primaryNavClasses(isEventsRoute)"
              >
                <span class="block font-semibold">Événements</span>
                <span class="mt-1 block text-xs opacity-80">Rédaction, brouillons et publications</span>
              </RouterLink>
              <RouterLink
                v-if="canModerate"
                to="/backoffice/moderation"
                class="rounded-2xl border px-4 py-3 text-sm transition"
                :class="primaryNavClasses(isModerationRoute)"
              >
                <span class="block font-semibold">Modération</span>
                <span class="mt-1 block text-xs opacity-80">File d’attente et décisions éditoriales</span>
              </RouterLink>
              <RouterLink
                v-if="isAdmin"
                to="/backoffice/admin/users"
                class="rounded-2xl border px-4 py-3 text-sm transition"
                :class="primaryNavClasses(isAdminRoute)"
              >
                <span class="block font-semibold">Administration</span>
                <span class="mt-1 block text-xs opacity-80">Utilisateurs, catégories et réglages</span>
              </RouterLink>
            </nav>

            <div class="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
                @click="goToHome"
              >
                Retour au site
              </button>
              <button
                v-if="isAuthenticated"
                type="button"
                class="rounded-full border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                @click="handleLogout"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </aside>

        <div class="space-y-5">
          <div class="rounded-[2rem] border border-sky-100 bg-white/95 p-6 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.24)] backdrop-blur">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-3xl">
                <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ sectionEyebrow }}</p>
                <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{{ sectionTitle }}</h2>
                <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  {{ sectionLead }}
                </p>
              </div>
              <div v-if="isAdminRoute" class="rounded-2xl border border-sky-100 bg-sky-50/80 p-3">
                <p class="px-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Sous-navigation</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <RouterLink
                    to="/backoffice/admin/users"
                    class="rounded-full px-4 py-2 text-sm transition"
                    :class="subNavClasses(isAdminUsersRoute)"
                  >
                    Utilisateurs
                  </RouterLink>
                  <RouterLink
                    to="/backoffice/admin/categories"
                    class="rounded-full px-4 py-2 text-sm transition"
                    :class="subNavClasses(isAdminCategoriesRoute)"
                  >
                    Catégories
                  </RouterLink>
                  <RouterLink
                    to="/backoffice/admin/settings"
                    class="rounded-full px-4 py-2 text-sm transition"
                    :class="subNavClasses(isAdminSettingsRoute)"
                  >
                    Réglages
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!isAuthenticated" class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.24)]">
            <h3 class="text-xl font-medium text-slate-900">Connexion requise</h3>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Connectez-vous pour accéder aux outils de rédaction, de modération ou d’administration.
            </p>
            <button
              type="button"
              class="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              @click="goToLogin"
            >
              Se connecter
            </button>
          </div>

          <div v-else class="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.2)] backdrop-blur sm:p-6 lg:p-7">
            <RouterView />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../../components/navigation/Header.vue";
import { useAuthStore, type Role } from "../../stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { role, isAuthenticated, canEdit, canModerate, isAdmin } = storeToRefs(authStore);

const roleLabels: Record<Role, string> = {
  VISITOR: "Visiteur",
  EDITOR: "Rédacteur",
  MODERATOR: "Modérateur",
  ADMIN: "Administrateur"
};

const isEventsRoute = computed(() => route.path.startsWith("/backoffice/events"));
const isModerationRoute = computed(() => route.path.startsWith("/backoffice/moderation"));
const isAdminRoute = computed(() => route.path.startsWith("/backoffice/admin"));
const isAdminUsersRoute = computed(() => route.path.endsWith("/admin/users"));
const isAdminCategoriesRoute = computed(() => route.path.endsWith("/admin/categories"));
const isAdminSettingsRoute = computed(() => route.path.endsWith("/admin/settings"));

const sectionEyebrow = computed(() => {
  if (isEventsRoute.value) return "Pilotage éditorial";
  if (isModerationRoute.value) return "Validation";
  if (isAdminRoute.value) return "Configuration";
  return "Backoffice";
});

const sectionTitle = computed(() => {
  if (route.path === "/backoffice/events/new") return "Création et édition d’événement";
  if (isEventsRoute.value) return "Événements";
  if (route.path.includes("/backoffice/moderation/view/")) return "Prévisualisation avant publication";
  if (isModerationRoute.value) return "Modération";
  if (isAdminUsersRoute.value) return "Administration des utilisateurs";
  if (isAdminCategoriesRoute.value) return "Administration des catégories";
  if (isAdminSettingsRoute.value) return "Réglages du site";
  if (isAdminRoute.value) return "Administration";
  return "Espace professionnel";
});

const sectionLead = computed(() => {
  if (route.path === "/backoffice/events/new") {
    return "Renseignez votre fiche dans un parcours plus clair, avec des sections distinctes pour l’identité, la programmation, le lieu et les contacts.";
  }
  if (isEventsRoute.value) {
    return "Suivez vos brouillons, vos retours de modération et vos publications depuis une vue de gestion pensée pour le travail éditorial quotidien.";
  }
  if (route.path.includes("/backoffice/moderation/view/")) {
    return "Vérifiez la publication telle qu’elle sera vue par le public, puis revenez à la file de modération pour prendre votre décision.";
  }
  if (isModerationRoute.value) {
    return "Traitez les demandes en attente dans une file claire, avec lecture rapide, motifs de refus et décisions principales bien séparées.";
  }
  if (isAdminRoute.value) {
    return "Administrez les comptes, les catégories et les réglages dans des vues spécialisées, avec des repères constants entre création, édition et gestion.";
  }
  return "Retrouvez ici l’ensemble des outils de gestion du site, organisés par métier plutôt qu’en tableau de bord générique.";
});

const sectionDescription = computed(() => {
  if (isEventsRoute.value) return "Section éditoriale active";
  if (isModerationRoute.value) return "Section de validation active";
  if (isAdminRoute.value) return "Section d’administration active";
  return "Accès aux outils métier";
});

const primaryNavClasses = (active: boolean) =>
  active
    ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.7)]"
    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/70";

const subNavClasses = (active: boolean) =>
  active
    ? "bg-slate-950 text-white shadow-[0_14px_28px_-20px_rgba(15,23,42,0.7)]"
    : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-white";

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
