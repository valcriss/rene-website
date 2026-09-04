import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import type { EventRevisionStatus } from "../api/events";
import { CreateEventPayload, EventItem, SocialLink, SocialLinkType, createEvent, submitEvent, updateEvent } from "../api/events";
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
  allDay: true,
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
  websiteUrl: "",
  socialLinks: []
});

const trimText = (value?: string | null) => (value ?? "").trim();

const defaultSocialLink = (): SocialLink => ({
  type: "FACEBOOK",
  url: ""
});

const cloneSocialLinks = (socialLinks?: SocialLink[]) => socialLinks?.map((link) => ({ ...link })) ?? [];

const PREVIEW_STORAGE_PREFIX = "rene-website-preview";

const extractDateInput = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (val: number) => val.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const normalizeDateBoundary = (value: string | null | undefined, endOfDay: boolean) => {
  const date = extractDateInput(value);
  if (!date) {
    return "";
  }

  return `${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
};

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
    editorForm.image = source.image ?? "";
    editorForm.categoryId = source.categoryId ?? "";
    editorForm.audienceId = source.audienceId ?? "";
    editorForm.eventStartAt = formatDateInput(source.eventStartAt ?? "");
    editorForm.eventEndAt = formatDateInput(source.eventEndAt ?? "");
    editorForm.allDay = true;
    editorForm.venueName = source.venueName ?? "";
    editorForm.address = source.address ?? "";
    editorForm.postalCode = source.postalCode ?? "";
    editorForm.city = source.city ?? "";
    editorForm.organizerName = source.organizerName ?? "";
    editorForm.organizerUrl = source.organizerUrl ?? "";
    editorForm.contactEmail = source.contactEmail ?? "";
    editorForm.contactPhone = source.contactPhone ?? "";
    editorForm.ticketUrl = source.ticketUrl ?? "";
    editorForm.pricingInfo = source.pricingInfo ?? "";
    editorForm.websiteUrl = source.websiteUrl ?? "";
    editorForm.socialLinks = cloneSocialLinks(source.socialLinks);
  };

  const setImageFile = (file: File | null) => {
    imageFile.value = file;
  };

  const buildEditorPayload = (): CreateEventPayload => ({
    ...editorForm,
    eventStartAt: normalizeDateBoundary(editorForm.eventStartAt, false),
    eventEndAt: normalizeDateBoundary(editorForm.eventEndAt, true),
    allDay: true,
    venueName: trimText(editorForm.venueName),
    address: trimText(editorForm.address),
    postalCode: trimText(editorForm.postalCode),
    city: trimText(editorForm.city),
    organizerUrl: editorForm.organizerUrl || undefined,
    contactEmail: editorForm.contactEmail || undefined,
    contactPhone: editorForm.contactPhone || undefined,
    ticketUrl: editorForm.ticketUrl || undefined,
    pricingInfo: editorForm.pricingInfo || undefined,
    websiteUrl: editorForm.websiteUrl || undefined,
    socialLinks:
      editorForm.socialLinks
        ?.map((link) => ({ type: link.type, url: link.url.trim() }))
        .filter((link) => link.url.length > 0) ?? []
  });

  const buildPreviewEvent = (): EventItem => ({
    id: editingEventId.value ?? "preview-event",
    title: editorForm.title || "Prévisualisation",
    content: editorForm.content ?? null,
    image: (imageFile.value ? URL.createObjectURL(imageFile.value) : editorForm.image) ?? null,
    categoryId: editorForm.categoryId ?? null,
    audienceId: editorForm.audienceId ?? null,
    eventStartAt: normalizeDateBoundary(editorForm.eventStartAt, false) || new Date().toISOString(),
    eventEndAt:
      normalizeDateBoundary(editorForm.eventEndAt || editorForm.eventStartAt, true) || new Date().toISOString(),
    allDay: true,
    venueName: trimText(editorForm.venueName),
    address: trimText(editorForm.address),
    postalCode: trimText(editorForm.postalCode),
    city: trimText(editorForm.city) || "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    organizerName: editorForm.organizerName ?? null,
    organizerUrl: editorForm.organizerUrl ?? undefined,
    contactEmail: editorForm.contactEmail ?? undefined,
    contactPhone: editorForm.contactPhone ?? undefined,
    ticketUrl: editorForm.ticketUrl ?? undefined,
    pricingInfo: editorForm.pricingInfo ?? undefined,
    websiteUrl: editorForm.websiteUrl ?? undefined,
    socialLinks: cloneSocialLinks(editorForm.socialLinks),
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt:
      normalizeDateBoundary(editorForm.eventEndAt || editorForm.eventStartAt, true) || new Date().toISOString(),
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
      if (imageFile.value) {
        payload.image = await uploadImage(imageFile.value);
      }

      const updated =
        editorMode.value === "edit" && editingEventId.value
          ? await updateEvent(editingEventId.value, payload, authStore.role)
          : await createEvent(payload, authStore.role);
      eventsStore.updateEventState(updated);
      imageFile.value = null;
      editorMode.value = "edit";
      editingEventId.value = updated.id;
      editingPublishedEvent.value = updated.status === "PUBLISHED";
      editingPublishedRevisionStatus.value = updated.pendingRevision?.status ?? null;
      editorForm.image = updated.image;
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

  const formatDateInput = (value: string) => extractDateInput(value);

  const addSocialLink = () => {
    editorForm.socialLinks = [...(editorForm.socialLinks ?? []), defaultSocialLink()];
  };

  const removeSocialLink = (index: number) => {
    editorForm.socialLinks = (editorForm.socialLinks ?? []).filter((_, currentIndex) => currentIndex !== index);
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const nextLinks = cloneSocialLinks(editorForm.socialLinks);
    const current = nextLinks[index];
    if (!current) {
      return;
    }

    if (field === "type") {
      current.type = value as SocialLinkType;
    } else {
      current.url = value;
    }

    editorForm.socialLinks = nextLinks;
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
    addSocialLink,
    removeSocialLink,
    updateSocialLink,
    getEditorError,
    getEditorFormValues
  };
});
