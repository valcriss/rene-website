<template>
  <section class="grid gap-6">
    <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
      <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ t("profile.eyebrow") }}</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-950">{{ t("profile.title") }}</h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {{ t("profile.lead") }}
      </p>
    </div>

    <div v-if="!canModerate" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">{{ t("common.accessDenied") }}</h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("profile.denied") }}
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("profile.account") }}</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("common.name") }}</p>
            <p class="mt-1 text-sm font-medium text-slate-900">{{ userName }}</p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("common.email") }}</p>
            <p class="mt-1 text-sm font-medium text-slate-900">{{ userEmail }}</p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-[0.26em] text-slate-500">{{ t("common.role") }}</p>
            <p class="mt-1 text-sm font-medium text-slate-900">{{ roleLabel }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]" data-testid="category-subscriptions">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("profile.notifications") }}</p>
        <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("profile.categorySubscriptionsTitle") }}</h3>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {{ t("profile.categorySubscriptionsLead") }}
        </p>

        <div v-if="subscriptionsError" class="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {{ subscriptionsError }}
        </div>

        <div v-if="subscriptionsLoading" class="mt-4 flex items-center gap-3 text-slate-500">
          <LoadingSpinner size="sm" />
          <span>{{ t("admin.loading") }}</span>
        </div>

        <ul v-else class="mt-4 grid gap-2">
          <li
            v-for="category in categorySubscriptions"
            :key="category.id"
            class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
          >
            <span class="text-sm font-medium text-slate-800">{{ category.name }}</span>
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                :checked="category.subscribed"
                :aria-label="category.name"
                @change="handleToggle(category.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ category.subscribed ? t("profile.subscribed") : t("profile.unsubscribed") }}
            </label>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
import { useSubscriptionsStore } from "../../stores/subscriptions";
import LoadingSpinner from "../../components/LoadingSpinner.vue";

const { t } = useI18n();
const authStore = useAuthStore();
const subscriptionsStore = useSubscriptionsStore();

const { userName, userEmail, role, canModerate } = storeToRefs(authStore);
const { categorySubscriptions, subscriptionsLoading, subscriptionsError } = storeToRefs(subscriptionsStore);

const roleLabels: Record<string, string> = {
  VISITOR: t("backoffice.roleLabels.VISITOR"),
  EDITOR: t("backoffice.roleLabels.EDITOR"),
  MODERATOR: t("backoffice.roleLabels.MODERATOR"),
  ADMIN: t("backoffice.roleLabels.ADMIN")
};
const roleLabel = roleLabels[role.value];

const handleToggle = (categoryId: string, subscribed: boolean) => {
  subscriptionsStore.toggleCategorySubscription(categoryId, subscribed);
};

onMounted(() => {
  if (canModerate.value) {
    subscriptionsStore.loadCategorySubscriptions();
  }
});
</script>
