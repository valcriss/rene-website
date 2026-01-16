<template>
  <NavigationHeader @login="goToLogin" />

  <EventDetailView :event-id="detailEventId" @select="openEventDetail">
    <template #header>
      <button
        type="button"
        class="text-sm font-medium text-slate-600 hover:text-slate-900"
        @click="goToHome"
      >
        ← Retour à l'agenda
      </button>
    </template>
  </EventDetailView>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import NavigationHeader from "../components/navigation/Header.vue";
import EventDetailView from "../components/events/EventDetailView.vue";

const router = useRouter();
const route = useRoute();
const detailEventId = computed(() => String(route.params.id));

const goToHome = () => {
  router.push("/");
};

const goToLogin = () => {
  router.push("/login");
};

const openEventDetail = (id: string) => {
  router.push(`/event/${id}`);
};
</script>
