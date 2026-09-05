import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import type { EventRevisionStatus, GeolocationPrecision } from "../api/events";
import {
  CreateEventPayload,
  EventItem,
  EventOccurrence,
  EventOccurrenceInput,
  SocialLink,
  SocialLinkType,
  createEvent,
  submitEvent,
  updateEvent
} from "../api/events";
import { uploadImage } from "../api/uploads";
import { computePublicationEndAt } from "../utils/occurrences";
import { useAuthStore } from "./auth";
import { useEventsStore } from "./events";

const defaultOccurrence = (): EventOccurrenceInput => ({
  venueName: "",
  address: "",
  postalCode: "",
  city: "",
  latitude: null,
  longitude: null,
  eventStartAt: "",
  eventEndAt: "",
  allDay: true
});

const defaultEditorForm = (): CreateEventPayload => ({
  title: "",
  content: "",
  image: "",
  categoryId: "",
  audienceId: "",
  occurrences: [defaultOccurrence()],
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

const isBlankOccurrence = (occurrence: EventOccurrenceInput) =>
  !trimText(occurrence.venueName) &&
  !trimText(occurrence.address) &&
  !trimText(occurrence.postalCode) &&
  !trimText(occurrence.city) &&
  !occurrence.eventStartAt &&
  !occurrence.eventEndAt &&
  typeof occurrence.latitude !== "number" &&
  typeof occurrence.longitude !== "number";

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
  const useManualLocation = ref<boolean[]>([false]);
  const lastGeolocationPrecision = ref<Array<GeolocationPrecision | null>>([null]);

  const resetEditorForm = () => {
    editorMode.value = "create";
    editingEventId.value = null;
    editingPublishedEvent.value = false;
    editingPublishedRevisionStatus.value = null;
    imageFile.value = null;
    useManualLocation.value = [false];
    lastGeolocationPrecision.value = [null];
    Object.assign(editorForm, defaultEditorForm());
  };

  const setManualLocation = (index: number, value: boolean) => {
    useManualLocation.value[index] = value;
  };

  const addOccurrence = () => {
    editorForm.occurrences = [...editorForm.occurrences, defaultOccurrence()];
    useManualLocation.value = [...useManualLocation.value, false];
    lastGeolocationPrecision.value = [...lastGeolocationPrecision.value, null];
  };

  const removeOccurrence = (index: number) => {
    editorForm.occurrences = editorForm.occurrences.filter((_, currentIndex) => currentIndex !== index);
    useManualLocation.value = useManualLocation.value.filter((_, currentIndex) => currentIndex !== index);
    lastGeolocationPrecision.value = lastGeolocationPrecision.value.filter((_, currentIndex) => currentIndex !== index);
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

    const sourceOccurrences: EventOccurrence[] = source.occurrences && source.occurrences.length > 0
      ? source.occurrences
      : [];

    editorForm.occurrences = sourceOccurrences.length > 0
      ? sourceOccurrences.map((occurrence) => ({
          venueName: occurrence.venueName ?? "",
          address: occurrence.address ?? "",
          postalCode: occurrence.postalCode ?? "",
          city: occurrence.city ?? "",
          latitude: occurrence.latitude ?? null,
          longitude: occurrence.longitude ?? null,
          eventStartAt: extractDateInput(occurrence.eventStartAt),
          eventEndAt: extractDateInput(occurrence.eventEndAt),
          allDay: true
        }))
      : [defaultOccurrence()];
    useManualLocation.value = editorForm.occurrences.map(() => false);
    lastGeolocationPrecision.value = sourceOccurrences.length > 0
      ? sourceOccurrences.map((occurrence) => occurrence.geolocationPrecision ?? null)
      : [null];

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

  const hasManualCoordinates = (index: number) => {
    const occurrence = editorForm.occurrences[index];
    return (
      useManualLocation.value[index] === true &&
      typeof occurrence.latitude === "number" &&
      Number.isFinite(occurrence.latitude) &&
      typeof occurrence.longitude === "number" &&
      Number.isFinite(occurrence.longitude)
    );
  };

  const getRetainedOccurrenceIndices = () =>
    editorForm.occurrences
      .map((occurrence, index) => ({ occurrence, index }))
      .filter(({ occurrence }) => !isBlankOccurrence(occurrence))
      .map(({ index }) => index);

  const buildEditorPayload = (retainedIndices: number[] = getRetainedOccurrenceIndices()): CreateEventPayload => ({
    ...editorForm,
    occurrences: retainedIndices.map((index) => {
      const occurrence = editorForm.occurrences[index];
      return {
        eventStartAt: normalizeDateBoundary(occurrence.eventStartAt, false),
        eventEndAt: normalizeDateBoundary(occurrence.eventEndAt, true),
        allDay: true,
        venueName: trimText(occurrence.venueName),
        address: trimText(occurrence.address),
        postalCode: trimText(occurrence.postalCode),
        city: trimText(occurrence.city),
        latitude: hasManualCoordinates(index) ? occurrence.latitude : undefined,
        longitude: hasManualCoordinates(index) ? occurrence.longitude : undefined
      };
    }),
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

  const buildPreviewEvent = (): EventItem => {
    const now = new Date().toISOString();
    const previewOccurrences: EventOccurrence[] = (
      editorForm.occurrences.length > 0 ? editorForm.occurrences : [defaultOccurrence()]
    ).map((occurrence, index) => ({
      id: `preview-occurrence-${index}`,
      venueName: trimText(occurrence.venueName),
      address: trimText(occurrence.address),
      postalCode: trimText(occurrence.postalCode),
      city: trimText(occurrence.city) || "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      eventStartAt: normalizeDateBoundary(occurrence.eventStartAt, false) || now,
      eventEndAt: normalizeDateBoundary(occurrence.eventEndAt || occurrence.eventStartAt, true) || now,
      allDay: true,
      createdAt: now,
      updatedAt: now
    }));

    return {
      id: editingEventId.value ?? "preview-event",
      title: editorForm.title || "Prévisualisation",
      content: editorForm.content ?? null,
      image: (imageFile.value ? URL.createObjectURL(imageFile.value) : editorForm.image) ?? null,
      categoryId: editorForm.categoryId ?? null,
      audienceId: editorForm.audienceId ?? null,
      occurrences: previewOccurrences,
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
      publicationEndAt: computePublicationEndAt(previewOccurrences) ?? now,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now
    };
  };

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
    const retainedIndices = getRetainedOccurrenceIndices();
    const payload = buildEditorPayload(retainedIndices);
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
      const resolvedOccurrences = updated.pendingRevision?.occurrences ?? updated.occurrences;
      retainedIndices.forEach((formIndex, resolvedIndex) => {
        const resolved = resolvedOccurrences[resolvedIndex];
        if (!resolved) {
          return;
        }
        lastGeolocationPrecision.value[formIndex] = resolved.geolocationPrecision ?? null;
        editorForm.occurrences[formIndex].latitude = resolved.latitude ?? null;
        editorForm.occurrences[formIndex].longitude = resolved.longitude ?? null;
      });
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
    useManualLocation,
    lastGeolocationPrecision,
    setManualLocation,
    addOccurrence,
    removeOccurrence,
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
    formatDateInput,
    getEditorError,
    getEditorFormValues
  };
});
