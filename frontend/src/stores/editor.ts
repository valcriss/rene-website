import { reactive, ref } from "vue";
import { defineStore } from "pinia";
import { CreateEventPayload, EventItem, createEvent, submitEvent, updateEvent } from "../api/events";
import { geocodeEventLocation } from "../api/geocoding";
import { uploadImage } from "../api/uploads";
import { useAuthStore } from "./auth";
import { useEventsStore } from "./events";

const defaultEditorForm = (): CreateEventPayload => ({
  title: "",
  content: "",
  image: "",
  categoryId: "",
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
  websiteUrl: ""
});

export const useEditorStore = defineStore("editor", () => {
  const editorMode = ref<"create" | "edit">("create");
  const editingEventId = ref<string | null>(null);
  const editorError = ref<string | null>(null);
  const editorForm = reactive<CreateEventPayload>(defaultEditorForm());
  const imageFile = ref<File | null>(null);

  const resetEditorForm = () => {
    editorMode.value = "create";
    editingEventId.value = null;
    imageFile.value = null;
    Object.assign(editorForm, defaultEditorForm());
  };

  const startEdit = (eventItem: EventItem) => {
    editorMode.value = "edit";
    editingEventId.value = eventItem.id;
    imageFile.value = null;
    editorForm.title = eventItem.title;
    editorForm.content = eventItem.content ?? "";
    editorForm.image = eventItem.image;
    editorForm.categoryId = eventItem.categoryId;
    editorForm.eventStartAt = formatDateTimeInput(eventItem.eventStartAt);
    editorForm.eventEndAt = formatDateTimeInput(eventItem.eventEndAt);
    editorForm.allDay = eventItem.allDay ?? false;
    editorForm.venueName = eventItem.venueName;
    editorForm.address = eventItem.address ?? "";
    editorForm.postalCode = eventItem.postalCode ?? "";
    editorForm.city = eventItem.city;
    editorForm.organizerName = eventItem.organizerName ?? "";
    editorForm.organizerUrl = eventItem.organizerUrl ?? "";
    editorForm.contactEmail = eventItem.contactEmail ?? "";
    editorForm.contactPhone = eventItem.contactPhone ?? "";
    editorForm.ticketUrl = eventItem.ticketUrl ?? "";
    editorForm.websiteUrl = eventItem.websiteUrl ?? "";
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
    websiteUrl: editorForm.websiteUrl || undefined
  });

  const handleSaveDraft = async (): Promise<boolean> => {
    editorError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canEdit) return false;
    const payload = buildEditorPayload();
    const eventsStore = useEventsStore();
    try {
      if (!payload.image && !imageFile.value) {
        editorError.value = "L'image est requise.";
        return false;
      }

      if (imageFile.value) {
        payload.image = await uploadImage(imageFile.value);
      }

      await geocodeEventLocation({
        address: payload.address,
        postalCode: payload.postalCode,
        city: payload.city,
        venueName: payload.venueName
      });
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
      return true;
    } catch (err) {
      editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
      return false;
    }
  };

  const handleSubmitDraft = async (id?: string): Promise<boolean> => {
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
    editorForm,
    editorError,
    resetEditorForm,
    startEdit,
    setImageFile,
    handleSaveDraft,
    handleSubmitDraft,
    getEditorError,
    getEditorFormValues
  };
});
