<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-medium">Gestion des catégories</h2>
      <span class="text-sm text-slate-500">Rôle requis: administrateur</span>
    </div>

    <div v-if="!isAdmin" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les catégories.
      </p>
    </div>

    <div v-else class="mt-6 grid gap-8">
      <div v-if="adminError" class="rounded-xl bg-rose-50 p-4 text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="text-slate-500">Chargement de l'administration…</div>

      <div v-else class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6" data-testid="admin-category-form">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">
              {{ adminCategoryEditingId ? "Modifier une catégorie" : "Créer une catégorie" }}
            </h3>
            <button
              v-if="adminCategoryEditingId"
              type="button"
              class="text-sm text-slate-500 hover:text-slate-700"
              @click="resetAdminCategoryForm"
            >
              Nouveau
            </button>
          </div>

          <div class="mt-4 grid gap-4">
            <label class="text-sm text-slate-600">
              Nom
              <input
                v-model="adminCategoryForm.name"
                type="text"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nom de la catégorie"
              />
            </label>
          </div>

          <div class="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
              @click="handleSaveAdminCategory"
            >
              {{ adminCategoryEditingId ? "Mettre à jour" : "Créer" }}
            </button>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-900">Catégories</h3>
          <p class="mt-1 text-sm text-slate-500">{{ adminCategories.length }} catégories</p>
          <ul class="mt-4 grid gap-3" data-testid="admin-category-list">
            <li
              v-for="category in adminCategories"
              :key="category.id"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-slate-900">{{ category.name }}</p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                    @click="startAdminCategoryEdit(category)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-rose-500 px-3 py-2 text-sm text-white"
                    @click="handleDeleteAdminCategory(category.id)"
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
  adminCategoryEditingId,
  adminCategoryForm,
  adminCategories
} = storeToRefs(adminStore);

const {
  resetAdminCategoryForm,
  handleSaveAdminCategory,
  startAdminCategoryEdit,
  handleDeleteAdminCategory
} = adminStore;
</script>
