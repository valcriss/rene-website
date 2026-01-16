import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import { EventItem, fetchEvents } from "../api/events";
import { filterEvents, type EventFilters } from "../events/filterEvents";
import placeholderEvent from "../assets/event-placeholder.svg";
import { publishEvent, rejectEvent, type ModeratorRole } from "../api/moderation";
import { useAuthStore } from "./auth";

const pad = (value: number) => value.toString().padStart(2, "0");

const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const defaultFilters = (): EventFilters => ({
  search: "",
  cities: [],
  types: [],
  preset: "",
  dateRange: {
    start: formatDateInput(new Date()),
    end: ""
  }
});

export const useEventsStore = defineStore("events", () => {
  const events = ref<EventItem[]>([]);
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const moderationError = ref<string | null>(null);
  const imageErrorById = reactive<Record<string, boolean>>({});
  const rejectionReasons = reactive<Record<string, string>>({});

  const filters = ref<EventFilters>(defaultFilters());

  const publishedEvents = computed(() => events.value.filter((event) => event.status === "PUBLISHED"));
  const pendingEvents = computed(() => events.value.filter((event) => event.status === "PENDING"));
  const filteredEvents = computed(() =>
    filterEvents(publishedEvents.value, {
      search: filters.value.search,
      cities: filters.value.cities,
      types: filters.value.types,
      dateRange: filters.value.dateRange
    })
  );
  const editableEvents = computed(() =>
    events.value.filter((event) => event.status === "DRAFT" || event.status === "REJECTED")
  );
  const availableCities = computed(() =>
    Array.from(new Set(publishedEvents.value.map((event) => event.city))).sort()
  );
  const availableTypes = computed(() =>
    Array.from(new Set(publishedEvents.value.map((event) => event.categoryId))).sort()
  );

  const getEventById = (id: string) => events.value.find((event) => event.id === id) ?? null;

  const updateEventState = (updated: EventItem) => {
    const exists = events.value.some((event) => event.id === updated.id);
    events.value = exists
      ? events.value.map((event) => (event.id === updated.id ? updated : event))
      : [updated, ...events.value];
  };

  const fetchEventsData = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      events.value = await fetchEvents();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur inconnue";
    } finally {
      isLoading.value = false;
    }
  };

  const markImageError = (id: string) => {
    imageErrorById[id] = true;
  };

  const getEventImage = (eventItem: EventItem) => {
    if (!eventItem.image || imageErrorById[eventItem.id]) {
      return placeholderEvent;
    }
    return eventItem.image;
  };

  const getEventExcerpt = (eventItem: EventItem) => eventItem.content ?? "";

  const toggleCity = (city: string) => {
    const next = new Set(filters.value.cities);
    if (next.has(city)) {
      next.delete(city);
    } else {
      next.add(city);
    }
    filters.value.cities = Array.from(next);
  };

  const toggleType = (type: string) => {
    const next = new Set(filters.value.types);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    filters.value.types = Array.from(next);
  };

  const handleDateRangeChange = () => {
    filters.value.preset = "";
  };

  const getPresetRange = (preset: string, now: Date) => {
    if (preset === "weekend") {
      const day = now.getDay();
      const daysUntilSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
      const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
      return { start: formatDateInput(saturday), end: formatDateInput(sunday) };
    }
    if (preset === "week") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
    if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
    return { start: filters.value.dateRange.start, end: filters.value.dateRange.end };
  };

  const applyPreset = () => {
    const range = getPresetRange(filters.value.preset, new Date());
    filters.value.dateRange.start = range.start;
    filters.value.dateRange.end = range.end;
  };

  const resetFilters = () => {
    filters.value = defaultFilters();
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString("fr-FR");
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return `${formatDate(start)} → ${formatDate(end)}`;
    }
    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();
    if (sameDay) {
      return formatDate(start);
    }
    return `${formatDate(start)} → ${formatDate(end)}`;
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const formatDateTimeRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return `${formatDateTime(start)} → ${formatDateTime(end)}`;
    }
    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();
    if (sameDay) {
      const dateLabel = startDate.toLocaleDateString("fr-FR", { dateStyle: "medium" });
      const startTime = startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const endTime = endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (startTime === endTime) {
        return `${dateLabel}, à ${startTime}`;
      }
      return `${dateLabel}, de ${startTime} à ${endTime}`;
    }
    return `${formatDateTime(start)} → ${formatDateTime(end)}`;
  };

  const formatOptional = (value?: string | null) => {
    if (!value || value.trim().length === 0) {
      return "Non renseigné";
    }
    return value;
  };

  const formatDateTimeInput = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const buildDirectionsUrl = (eventItem: EventItem) => {
    const destination = encodeURIComponent(`${eventItem.venueName}, ${eventItem.city}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  };

  const toIcsDate = (value: string) =>
    new Date(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const buildCalendarUrl = (eventItem: EventItem) => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//rene-website//agenda//FR",
      "BEGIN:VEVENT",
      `UID:${eventItem.id}@rene-website`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${toIcsDate(eventItem.eventStartAt)}`,
      `DTEND:${toIcsDate(eventItem.eventEndAt)}`,
      `SUMMARY:${eventItem.title}`,
      `LOCATION:${eventItem.venueName} - ${eventItem.city}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  };

  const handlePublish = async (id: string) => {
    moderationError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canModerate) return;
    try {
      const updated = await publishEvent(id, authStore.role as ModeratorRole);
      updateEventState(updated);
    } catch (err) {
      moderationError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleReject = async (id: string) => {
    moderationError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canModerate) return;
    const reason = rejectionReasons[id] ?? "";
    try {
      const updated = await rejectEvent(id, authStore.role as ModeratorRole, reason);
      updateEventState(updated);
      rejectionReasons[id] = "";
    } catch (err) {
      moderationError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const setRejectionReason = (id: string, value: string) => {
    rejectionReasons[id] = value;
  };

  const getModerationError = () => moderationError.value;

  return {
    events,
    isLoading,
    error,
    moderationError,
    imageErrorById,
    rejectionReasons,
    filters,
    publishedEvents,
    pendingEvents,
    filteredEvents,
    editableEvents,
    availableCities,
    availableTypes,
    getEventById,
    updateEventState,
    fetchEvents: fetchEventsData,
    markImageError,
    getEventImage,
    getEventExcerpt,
    toggleCity,
    toggleType,
    handleDateRangeChange,
    applyPreset,
    resetFilters,
    formatDate,
    formatDateRange,
    formatDateTimeRange,
    formatOptional,
    formatDateTimeInput,
    buildDirectionsUrl,
    buildCalendarUrl,
    handlePublish,
    handleReject,
    setRejectionReason,
    getModerationError
  };
});
