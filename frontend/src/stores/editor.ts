import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import type { EventRevisionStatus } from "../api/events";
import { CreateEventPayload, EventItem, createEvent, submitEvent, updateEvent } from "../api/events";
import { uploadImage } from "../api/uploads";
import { useAuthStore } from "./auth";
import { useEventsStore } from "./events";

const defaultEditorForm = (): CreateEventPayload => ({
  title: "",
  content: "",
  image: "",
  categoryId: "",
  audienceId: "",
  eventStartAt: "",
  eventEndAt: "",
  allDay: false,
  venueName: "",
  address: "",
  postalCode: "",
  city: "",
  organizerName: "",
  organizerUrl: "",
  contactEmail: "",
  contactPhone: "",
  ticketUrl: "",
  pricingInfo: "",
  websiteUrl: ""
});

const PREVIEW_STORAGE_PREFIX = "rene-website-preview";

export type EditorPreviewSnapshot = {
  token: string;
  event: EventItem;
};

const buildPreviewStorageKey = (token: string) => `${PREVIEW_STORAGE_PREFIX}:${token}`;

export const readEditorPreviewSnapshot = (token: string): EditorPreviewSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(buildPreviewStorageKey(token));
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as EditorPreviewSnapshot;
  } catch {
    return null;
  }
};

export const useEditorStore = defineStore("editor", () => {
  const editorMode = ref<"create" | "edit">("create");
  const editingEventId = ref<string | null>(null);
  const editingPublishedEvent = ref(false);
  const editingPublishedRevisionStatus = ref<EventRevisionStatus | null>(null);
  const editorError = ref<string | null>(null);
  const editorForm = reactive<CreateEventPayload>(defaultEditorForm());
  const imageFile = ref<File | null>(null);
  const isSavingDraft = ref(false);
  const isSubmittingForModeration = ref(false);
  const isPersisting = computed(() => isSavingDraft.value || isSubmittingForModeration.value);

  const resetEditorForm = () => {
    editorMode.value = "create";
    editingEventId.value = null;
    editingPublishedEvent.value = false;
    editingPublishedRevisionStatus.value = null;
    imageFile.value = null;
    Object.assign(editorForm, defaultEditorForm());
  };

  const startEdit = (eventItem: EventItem) => {
    const source = eventItem.pendingRevision ? { ...eventItem, ...eventItem.pendingRevision } : eventItem;
    editorMode.value = "edit";
    editingEventId.value = eventItem.id;
    editingPublishedEvent.value = eventItem.status === "PUBLISHED";
    editingPublishedRevisionStatus.value = eventItem.pendingRevision?.status ?? null;
    imageFile.value = null;
    editorForm.title = source.title;
    editorForm.content = source.content ?? "";
    editorForm.image = source.image;
    editorForm.categoryId = source.categoryId;
    editorForm.audienceId = source.audienceId;
    editorForm.eventStartAt = formatDateTimeInput(source.eventStartAt);
    editorForm.eventEndAt = formatDateTimeInput(source.eventEndAt);
    editorForm.allDay = source.allDay ?? false;
    editorForm.venueName = source.venueName;
    editorForm.address = source.address ?? "";
    editorForm.postalCode = source.postalCode ?? "";
    editorForm.city = source.city;
    editorForm.organizerName = source.organizerName ?? "";
    editorForm.organizerUrl = source.organizerUrl ?? "";
    editorForm.contactEmail = source.contactEmail ?? "";
    editorForm.contactPhone = source.contactPhone ?? "";
    editorForm.ticketUrl = source.ticketUrl ?? "";
    editorForm.pricingInfo = source.pricingInfo ?? "";
    editorForm.websiteUrl = source.websiteUrl ?? "";
  };

  const setImageFile = (file: File | null) => {
    imageFile.value = file;
  };

  const buildEditorPayload = (): CreateEventPayload => ({
    ...editorForm,
    organizerUrl: editorForm.organizerUrl || undefined,
    contactEmail: editorForm.contactEmail || undefined,
    contactPhone: editorForm.contactPhone || undefined,
    ticketUrl: editorForm.ticketUrl || undefined,
    pricingInfo: editorForm.pricingInfo || undefined,
    websiteUrl: editorForm.websiteUrl || undefined
  });

  const buildPreviewEvent = (): EventItem => ({
    id: editingEventId.value ?? "preview-event",
    title: editorForm.title || "Prévisualisation",
    content: editorForm.content,
    image: imageFile.value ? URL.createObjectURL(imageFile.value) : editorForm.image,
    categoryId: editorForm.categoryId,
    audienceId: editorForm.audienceId,
    eventStartAt: editorForm.eventStartAt || new Date().toISOString(),
    eventEndAt: editorForm.eventEndAt || editorForm.eventStartAt || new Date().toISOString(),
    allDay: editorForm.allDay,
    venueName: editorForm.venueName || "Lieu à confirmer",
    address: editorForm.address,
    postalCode: editorForm.postalCode,
    city: editorForm.city || "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    organizerName: editorForm.organizerName,
    organizerUrl: editorForm.organizerUrl,
    contactEmail: editorForm.contactEmail,
    contactPhone: editorForm.contactPhone,
    ticketUrl: editorForm.ticketUrl,
    pricingInfo: editorForm.pricingInfo,
    websiteUrl: editorForm.websiteUrl,
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: editorForm.eventEndAt || editorForm.eventStartAt || new Date().toISOString(),
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const savePreviewSnapshot = () => {
    const token = `${Date.now()}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        buildPreviewStorageKey(token),
        JSON.stringify({
          token,
          event: buildPreviewEvent()
        } satisfies EditorPreviewSnapshot)
      );
    }
    return token;
  };

  const persistDraft = async (): Promise<EventItem | null> => {
    editorError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canEdit) return null;
    const payload = buildEditorPayload();
    const eventsStore = useEventsStore();
    try {
      if (!payload.image && !imageFile.value) {
        editorError.value = "L'image est requise.";
        return null;
      }

      if (imageFile.value) {
        payload.image = await uploadImage(imageFile.value);
      }

      const updated =
        editorMode.value === "edit" && editingEventId.value
          ? await updateEvent(editingEventId.value, payload, authStore.role)
          : await createEvent(payload, authStore.role);
      eventsStore.updateEventState(updated);
      imageFile.value = null;
      if (editorMode.value === "create") {
        resetEditorForm();
      } else {
        editorForm.image = updated.image;
      }
      return updated;
    } catch (err) {
      editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
      return null;
    }
  };

  const submitDraft = async (id?: string): Promise<boolean> => {
    editorError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canEdit) return false;
    const targetId = typeof id === "string" ? id : editingEventId.value;
    if (!targetId) return false;
    const eventsStore = useEventsStore();
    try {
      const updated = await submitEvent(targetId, authStore.role);
      eventsStore.updateEventState(updated);
      resetEditorForm();
      return true;
    } catch (err) {
      editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
      return false;
    }
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (isPersisting.value) return false;
    isSavingDraft.value = true;
    try {
      return Boolean(await persistDraft());
    } finally {
      isSavingDraft.value = false;
    }
  };

  const saveDraftAndReturn = async (): Promise<EventItem | null> => {
    if (isPersisting.value) return null;
    isSavingDraft.value = true;
    try {
      return await persistDraft();
    } finally {
      isSavingDraft.value = false;
    }
  };

  const handleSubmitDraft = async (id?: string): Promise<boolean> => {
    if (isPersisting.value) return false;
    isSubmittingForModeration.value = true;
    try {
      return await submitDraft(id);
    } finally {
      isSubmittingForModeration.value = false;
    }
  };

  const handleSaveAndSubmit = async (): Promise<boolean> => {
    if (isPersisting.value) return false;
    isSubmittingForModeration.value = true;
    try {
      editorError.value = null;

      const savedEvent = await persistDraft();
      if (!savedEvent) {
        return false;
      }

      return await submitDraft(savedEvent.id);
    } finally {
      isSubmittingForModeration.value = false;
    }
  };

  const formatDateTimeInput = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const pad = (val: number) => val.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const getEditorError = () => editorError.value;
  const getEditorFormValues = () => ({ ...editorForm });

  return {
    editorMode,
    editingEventId,
    editingPublishedEvent,
    editingPublishedRevisionStatus,
    editorForm,
    editorError,
    isSavingDraft,
    isSubmittingForModeration,
    isPersisting,
    resetEditorForm,
    startEdit,
    setImageFile,
    savePreviewSnapshot,
    saveDraftAndReturn,
    handleSaveDraft,
    handleSaveAndSubmit,
    handleSubmitDraft,
    getEditorError,
    getEditorFormValues
  };
});
