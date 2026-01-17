<template>
  <section class="grid gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-medium">Ajouter un événement</h2>
        <p class="text-sm text-slate-500">Rôle requis: rédacteur, modérateur ou admin</p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
        @click="goToEvents"
      >
        Retour à mes événements
      </button>
    </div>

    <div v-if="!canEdit" class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 class="text-lg font-medium text-slate-900">Accès refusé</h3>
      <p class="mt-2 text-sm text-slate-500">
        Vous n'avez pas les droits nécessaires pour créer un événement.
      </p>
    </div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" data-testid="editor-form">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">
          {{ editorMode === "edit" ? "Modifier un événement" : "Créer un événement" }}
        </h3>
        <button
          v-if="editorMode === 'edit'"
          type="button"
          class="text-sm text-slate-500 hover:text-slate-700"
          @click="resetEditorForm"
        >
          Nouveau brouillon
        </button>
      </div>

      <div v-if="editorError" class="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">
        {{ editorError }}
      </div>

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <label class="text-sm text-slate-600">
          Titre
          <input
            v-model="editorForm.title"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Titre de l'événement"
          />
        </label>
        <label class="text-sm text-slate-600">
          Catégorie
          <select
            v-model="editorForm.categoryId"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            :disabled="categoriesLoading"
          >
            <option value="">Sélectionner une catégorie</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
          <p v-if="categoriesLoading" class="mt-2 text-xs text-slate-500">
            Chargement des catégories…
          </p>
          <p v-else-if="categories.length === 0" class="mt-2 text-xs text-slate-500">
            Aucune catégorie disponible.
          </p>
        </label>
        <label class="text-sm text-slate-600">
          Image
          <input
            type="file"
            accept="image/*"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            @change="handleImageChange"
          />
          <p v-if="editorForm.image" class="mt-2 text-xs text-slate-500">
            Image actuelle : {{ editorForm.image }}
          </p>
        </label>
        <label class="text-sm text-slate-600">
          Organisateur
          <input
            v-model="editorForm.organizerName"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nom de l'organisateur"
          />
        </label>
        <label class="text-sm text-slate-600">
          Début
          <input
            v-model="editorForm.eventStartAt"
            type="datetime-local"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          Fin
          <input
            v-model="editorForm.eventEndAt"
            type="datetime-local"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm text-slate-600">
          Lieu
          <input
            v-model="editorForm.venueName"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Salle, médiathèque..."
          />
        </label>
        <label class="text-sm text-slate-600">
          Adresse
          <input
            v-model="editorForm.address"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="12 rue..."
          />
        </label>
        <label class="text-sm text-slate-600">
          Code postal
          <input
            v-model="editorForm.postalCode"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="37000"
          />
        </label>
        <label class="text-sm text-slate-600">
          Ville
          <input
            v-model="editorForm.city"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Descartes"
          />
        </label>
        <label class="text-sm text-slate-600">
          Email contact
          <input
            v-model="editorForm.contactEmail"
            type="email"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="contact@exemple.fr"
          />
        </label>
        <label class="text-sm text-slate-600">
          Téléphone
          <input
            v-model="editorForm.contactPhone"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="06 00 00 00 00"
          />
        </label>
        <label class="text-sm text-slate-600">
          Billetterie
          <input
            v-model="editorForm.ticketUrl"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </label>
        <label class="text-sm text-slate-600">
          Site web
          <input
            v-model="editorForm.websiteUrl"
            type="text"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </label>
        <div class="text-sm text-slate-600 md:col-span-2">
          <p>Description</p>
          <div class="mt-2">
            <RichTextEditor v-model="editorForm.content" />
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          @click="handleSaveAndRedirect"
        >
          {{ editorMode === "edit" ? "Mettre à jour" : "Enregistrer le brouillon" }}
        </button>
        <button
          v-if="editorMode === 'edit'"
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          @click="handleSubmitAndRedirect"
        >
          Soumettre à modération
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import RichTextEditor from "../../components/form/RichTextEditor.vue";
import { useAuthStore } from "../../stores/auth";
import { useCategoriesStore } from "../../stores/categories";
import { useEditorStore } from "../../stores/editor";

const router = useRouter();
const authStore = useAuthStore();
const categoriesStore = useCategoriesStore();
const editorStore = useEditorStore();

const { canEdit } = storeToRefs(authStore);
const { categories, loading: categoriesLoading } = storeToRefs(categoriesStore);
const { editorMode, editorError, editorForm } = storeToRefs(editorStore);

const { resetEditorForm, handleSaveDraft, handleSubmitDraft, setImageFile } = editorStore;

onMounted(() => {
  categoriesStore.loadCategories();
});

const goToEvents = () => {
  router.push("/backoffice/events");
};

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  setImageFile(file);
};

const handleSaveAndRedirect = async () => {
  const isEdit = editorMode.value === "edit";
  const ok = await handleSaveDraft();
  if (ok && isEdit) {
    router.push("/backoffice/events");
  }
};

const handleSubmitAndRedirect = async () => {
  const ok = await handleSubmitDraft();
  if (ok) {
    router.push("/backoffice/events");
  }
};
</script>
