<template>
  <NavigationHeader :show-login="false" />

  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Activation du compte</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">Vérification de votre email</h1>
      <p class="mt-2 text-sm text-slate-500">{{ message }}</p>
      <button
        type="button"
        class="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
        @click="router.push('/login')"
      >
        Retour à la connexion
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const message = ref("Vérification en cours…");
const token = typeof route.query.token === "string" ? route.query.token : "";

onMounted(() => {
  if (!token) {
    message.value = "Le lien de vérification est invalide.";
    return;
  }

  authStore.verifyEmailAddress(token)
    .then(() => {
      message.value = "Votre adresse email est vérifiée. Vous pouvez maintenant vous connecter.";
    })
    .catch((error: unknown) => {
      message.value = error instanceof Error ? error.message : "La vérification de l’email a échoué.";
    });
});
</script>
