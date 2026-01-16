import { reactive, ref } from "vue";
import { defineStore } from "pinia";
import { CreateEventPayload, EventItem, createEvent, submitEvent, updateEvent } from "../api/events";
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
  latitude: 46.97,
  longitude: 0.7,
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

  const resetEditorForm = () => {
    editorMode.value = "create";
    editingEventId.value = null;
    Object.assign(editorForm, defaultEditorForm());
  };

  const startEdit = (eventItem: EventItem) => {
    editorMode.value = "edit";
    editingEventId.value = eventItem.id;
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
    editorForm.latitude = eventItem.latitude;
    editorForm.longitude = eventItem.longitude;
    editorForm.organizerName = eventItem.organizerName ?? "";
    editorForm.organizerUrl = eventItem.organizerUrl ?? "";
    editorForm.contactEmail = eventItem.contactEmail ?? "";
    editorForm.contactPhone = eventItem.contactPhone ?? "";
    editorForm.ticketUrl = eventItem.ticketUrl ?? "";
    editorForm.websiteUrl = eventItem.websiteUrl ?? "";
  };

  const buildEditorPayload = (): CreateEventPayload => ({
    ...editorForm,
    address: editorForm.address || undefined,
    organizerUrl: editorForm.organizerUrl || undefined,
    contactEmail: editorForm.contactEmail || undefined,
    contactPhone: editorForm.contactPhone || undefined,
    ticketUrl: editorForm.ticketUrl || undefined,
    websiteUrl: editorForm.websiteUrl || undefined
  });

  const handleSaveDraft = async () => {
    editorError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canEdit) return;
    const payload = buildEditorPayload();
    const eventsStore = useEventsStore();
    try {
      const updated =
        editorMode.value === "edit" && editingEventId.value
          ? await updateEvent(editingEventId.value, payload, authStore.role)
          : await createEvent(payload, authStore.role);
      eventsStore.updateEventState(updated);
      if (editorMode.value === "create") {
        resetEditorForm();
      }
    } catch (err) {
      editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleSubmitDraft = async (id?: string) => {
    editorError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canEdit) return;
    const targetId = id ?? editingEventId.value;
    if (!targetId) return;
    const eventsStore = useEventsStore();
    try {
      const updated = await submitEvent(targetId, authStore.role);
      eventsStore.updateEventState(updated);
      resetEditorForm();
    } catch (err) {
      editorError.value = err instanceof Error ? err.message : "Erreur inconnue";
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
    handleSaveDraft,
    handleSubmitDraft,
    getEditorError,
    getEditorFormValues
  };
});
