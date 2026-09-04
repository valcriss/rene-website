<template>
  <section class="grid gap-6">
    <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
      <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">{{ t("admin.title") }}</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-950">{{ t("admin.usersTitle") }}</h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {{ t("admin.usersLead") }}
      </p>
    </div>

    <div v-if="!isAdmin" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">{{ t("common.accessDenied") }}</h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ t("admin.deniedUsers") }}
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div v-if="adminError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
        <LoadingSpinner size="sm" />
        <span>{{ t("admin.loading") }}</span>
      </div>

      <div v-else class="grid gap-6 xl:grid-cols-[minmax(22rem,30rem)_minmax(0,1fr)]">
        <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]" data-testid="admin-user-form">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("admin.currentAction") }}</p>
              <h3 class="mt-2 text-lg font-semibold text-slate-950">
                {{ adminUserEditingId ? t("admin.editUser") : t("admin.createUser") }}
              </h3>
            </div>
            <button
              v-if="adminUserEditingId"
              type="button"
              class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
              @click="resetAdminUserForm"
            >
              {{ t("admin.newItem") }}
            </button>
          </div>

          <div class="mt-5 grid gap-4">
            <label class="text-sm text-slate-600">
              {{ t("common.name") }}
              <input v-model="adminUserForm.name" type="text" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" :placeholder="t('admin.fullName')" />
            </label>
            <label class="text-sm text-slate-600">
              {{ t("common.email") }}
              <input v-model="adminUserForm.email" type="email" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="prenom@exemple.fr" />
            </label>
            <label class="text-sm text-slate-600">
              {{ t("common.role") }}
              <select v-model="adminUserForm.role" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                <option value="EDITOR">{{ t("backoffice.roleLabels.EDITOR") }}</option>
                <option value="MODERATOR">{{ t("backoffice.roleLabels.MODERATOR") }}</option>
                <option value="ADMIN">{{ t("backoffice.roleLabels.ADMIN") }}</option>
              </select>
            </label>
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <button type="button" class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800" @click="handleSaveAdminUser">
              {{ adminUserEditingId ? t("common.update") : t("admin.createAction") }}
            </button>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ t("admin.overview") }}</p>
              <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("admin.existingUsers") }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                {{ t("admin.usersOverviewLead") }}
              </p>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              {{ t("admin.userCount", adminUsers.length) }}
            </span>
          </div>

          <ul class="mt-6 grid gap-3" data-testid="admin-user-list">
            <li v-for="user in adminUsers" :key="user.id" class="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ user.name }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ user.email }}</p>
                  <span class="mt-3 inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    {{ roleLabels[user.role] }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70" @click="startAdminUserEdit(user)">
                    {{ t("common.edit") }}
                  </button>
                  <button type="button" class="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700" @click="handleDeleteAdminUser(user.id)">
                    {{ t("common.delete") }}
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
import { useAdminStore } from "../../stores/admin";
import LoadingSpinner from "../../components/LoadingSpinner.vue";

const authStore = useAuthStore();
const adminStore = useAdminStore();
const { t } = useI18n();

const roleLabels = computed<Record<string, string>>(() => ({
  EDITOR: t("backoffice.roleLabels.EDITOR"),
  MODERATOR: t("backoffice.roleLabels.MODERATOR"),
  ADMIN: t("backoffice.roleLabels.ADMIN")
}));

const { isAdmin } = storeToRefs(authStore);
const { adminError, adminLoading, adminUserEditingId, adminUserForm, adminUsers } = storeToRefs(adminStore);
const { resetAdminUserForm, handleSaveAdminUser, startAdminUserEdit, handleDeleteAdminUser } = adminStore;
</script>
