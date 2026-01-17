<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Espace professionnel</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">Connexion</h1>
      <p class="mt-2 text-sm text-slate-500">
        Accédez au backoffice pour publier et gérer les événements culturels.
      </p>

      <div class="mt-6 grid gap-4">
        <label class="text-sm text-slate-600">
          Email
          <input
            v-model="email"
            type="email"
            placeholder="prenom@exemple.fr"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          Mot de passe
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          @click="handleLogin"
        >
          Se connecter
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="goToHome"
        >
          Retour au site
        </button>
        <span v-if="canEdit" class="text-sm text-emerald-600">Accès rédaction/modération activé.</span>
        <span v-if="authError" class="text-sm text-rose-600">{{ authError }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const { email, password, canEdit, authError } = storeToRefs(authStore);

const handleLogin = async () => {
  authError.value = null;
  try {
    await authStore.loginWithPassword();
    authStore.resetCredentials();
    router.push("/backoffice");
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "Connexion impossible";
  }
};

const goToHome = () => {
  router.push("/");
};
</script>
