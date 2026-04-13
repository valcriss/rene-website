<template>
  <section class="grid gap-6">
    <div class="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.24)]">
      <p class="text-xs uppercase tracking-[0.3em] text-sky-700/70">Administration</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-950">Catégories</h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Gérez la taxonomie éditoriale du site dans une vue qui sépare clairement création, édition et inventaire existant.
      </p>
    </div>

    <div v-if="!isAdmin" class="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour gérer les catégories.
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div v-if="adminError" class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        {{ adminError }}
      </div>

      <div v-if="adminLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
        Chargement de l'administration…
      </div>

      <div v-else class="grid gap-6 xl:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]" data-testid="admin-category-form">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Action en cours</p>
              <h3 class="mt-2 text-lg font-semibold text-slate-950">
                {{ adminCategoryEditingId ? "Modifier une catégorie" : "Créer une catégorie" }}
              </h3>
            </div>
            <button
              v-if="adminCategoryEditingId"
              type="button"
              class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900"
              @click="resetAdminCategoryForm"
            >
              Nouveau
            </button>
          </div>

          <div class="mt-5 grid gap-4">
            <label class="text-sm text-slate-600">
              Nom
              <input
                v-model="adminCategoryForm.name"
                type="text"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Nom de la catégorie"
              />
            </label>
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              @click="handleSaveAdminCategory"
            >
              {{ adminCategoryEditingId ? "Mettre à jour" : "Créer" }}
            </button>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">Référentiel</p>
              <h3 class="mt-2 text-lg font-semibold text-slate-950">Catégories existantes</h3>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                Gardez une lecture simple de la taxonomie et ouvrez le bon mode d’édition en un clic.
              </p>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              {{ adminCategories.length }} catégorie<span v-if="adminCategories.length > 1">s</span>
            </span>
          </div>

          <ul class="mt-6 grid gap-3" data-testid="admin-category-list">
            <li
              v-for="category in adminCategories"
              :key="category.id"
              class="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p class="text-sm font-semibold text-slate-900">{{ category.name }}</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/70"
                    @click="startAdminCategoryEdit(category)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
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
