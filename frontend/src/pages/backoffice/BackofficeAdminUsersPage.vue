<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-medium">Administration du site</h2>
      <span class="text-sm text-slate-500">Rôle requis: administrateur</span>
    </div>

    <div v-if="!isAdmin" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les utilisateurs.
      </p>
    </div>

    <div v-else class="mt-6 grid gap-8">
      <div v-if="adminError" class="rounded-xl bg-rose-50 p-4 text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="text-slate-500">Chargement de l'administration…</div>

      <div v-else class="grid gap-8">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="admin-user-form">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">
              {{ adminUserEditingId ? "Modifier un utilisateur" : "Créer un utilisateur" }}
            </h3>
            <button
              v-if="adminUserEditingId"
              type="button"
              class="text-sm text-slate-500 hover:text-slate-700"
              @click="resetAdminUserForm"
            >
              Nouveau
            </button>
          </div>

          <div class="mt-4 grid gap-4">
            <label class="text-sm text-slate-600">
              Nom
              <input
                v-model="adminUserForm.name"
                type="text"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nom complet"
              />
            </label>
            <label class="text-sm text-slate-600">
              Email
              <input
                v-model="adminUserForm.email"
                type="email"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="prenom@exemple.fr"
              />
            </label>
            <label class="text-sm text-slate-600">
              Rôle
              <select
                v-model="adminUserForm.role"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="EDITOR">Rédacteur</option>
                <option value="MODERATOR">Modérateur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </label>
          </div>

          <div class="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
              @click="handleSaveAdminUser"
            >
              {{ adminUserEditingId ? "Mettre à jour" : "Créer" }}
            </button>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-900">Utilisateurs</h3>
          <p class="mt-1 text-sm text-slate-500">{{ adminUsers.length }} utilisateurs</p>
          <ul class="mt-4 grid gap-3" data-testid="admin-user-list">
            <li
              v-for="user in adminUsers"
              :key="user.id"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ user.name }}</p>
                  <p class="text-sm text-slate-500">{{ user.email }}</p>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ user.role }}</p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                    @click="startAdminUserEdit(user)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white"
                    @click="handleDeleteAdminUser(user.id)"
                  >
                    Supprimer
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
import { storeToRefs } from "pinia";
import { useAuthStore } from "../../stores/auth";
import { useAdminStore } from "../../stores/admin";

const authStore = useAuthStore();
const adminStore = useAdminStore();

const { isAdmin } = storeToRefs(authStore);
const {
  adminError,
  adminLoading,
  adminUserEditingId,
  adminUserForm,
  adminUsers
} = storeToRefs(adminStore);

const {
  resetAdminUserForm,
  handleSaveAdminUser,
  startAdminUserEdit,
  handleDeleteAdminUser
} = adminStore;
</script>
