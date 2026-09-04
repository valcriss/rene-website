import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import { EventItem, GeolocationPrecision, deleteEvent, fetchEvents } from "../api/events";
import { filterEvents, type EventFilters } from "../events/filterEvents";
import placeholderEvent from "../assets/event-placeholder.svg";
import { publishEventWithFeatured, rejectEvent, updateEventFeatured, type ModeratorRole } from "../api/moderation";
import {
  formatDate,
  formatDateRange,
  formatDateTimeRange,
  formatUpdatedAtLabel,
  formatOptional
} from "../utils/formatters";
import { getEventCalendarLocation, getEventDirectionsQuery } from "../utils/eventLocation";
import { useAuthStore } from "./auth";

const pad = (value: number) => value.toString().padStart(2, "0");

const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const defaultFilters = (): EventFilters => ({
  search: "",
  cities: [],
  types: [],
  audiences: [],
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
  const deleteError = ref<string | null>(null);
  const imageErrorById = reactive<Record<string, boolean>>({});
  const rejectionReasons = reactive<Record<string, string>>({});
  const featuredEventIds = reactive<Record<string, boolean>>({});

  const hasResolvedCoordinates = (
    event: Pick<EventItem, "latitude" | "longitude">
  ): event is Pick<EventItem, "latitude" | "longitude"> & { latitude: number; longitude: number } =>
    typeof event.latitude === "number" &&
    Number.isFinite(event.latitude) &&
    typeof event.longitude === "number" &&
    Number.isFinite(event.longitude);

  const getGeolocationPrecision = (
    event: Pick<EventItem, "latitude" | "longitude" | "geolocationPrecision">
  ): GeolocationPrecision => event.geolocationPrecision ?? (hasResolvedCoordinates(event) ? "EXACT" : "UNRESOLVED");

  const hasApproximateGeolocation = (
    event: Pick<EventItem, "latitude" | "longitude" | "geolocationPrecision">
  ) => hasResolvedCoordinates(event) && getGeolocationPrecision(event) === "APPROXIMATE";

  const canSubmitForModeration = (
    event: Pick<EventItem, "latitude" | "longitude" | "geolocationPrecision">
  ) => hasResolvedCoordinates(event) && getGeolocationPrecision(event) !== "UNRESOLVED";

  const filters = ref<EventFilters>(defaultFilters());

  const getPendingRevisionSnapshot = (event: EventItem): EventItem => {
    if (!event.pendingRevision) {
      return event;
    }

    return {
      ...event,
      ...event.pendingRevision,
      id: event.id,
      createdByUserId: event.createdByUserId,
      status: "PENDING",
      publishedAt: event.publishedAt,
      publicationEndAt: event.pendingRevision.eventEndAt ?? undefined,
      rejectionReason: event.pendingRevision.rejectionReason,
      pendingRevision: event.pendingRevision,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
  };

  const getEditionSnapshot = (event: EventItem): EventItem => {
    if (!event.pendingRevision) {
      return event;
    }

    return {
      ...event,
      ...event.pendingRevision,
      id: event.id,
      createdByUserId: event.createdByUserId,
      status: event.pendingRevision.status,
      publishedAt: event.publishedAt,
      publicationEndAt: event.pendingRevision.eventEndAt ?? undefined,
      rejectionReason: event.pendingRevision.rejectionReason,
      pendingRevision: event.pendingRevision,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
  };

  const publishedEvents = computed(() => events.value.filter((event) => event.status === "PUBLISHED"));
  const pendingEvents = computed(() =>
    events.value
      .filter((event) => event.status === "PENDING" || event.pendingRevision?.status === "PENDING")
      .map((event) => (event.pendingRevision?.status === "PENDING" ? getPendingRevisionSnapshot(event) : event))
  );
  const filteredEvents = computed(() =>
    filterEvents(publishedEvents.value, {
      search: filters.value.search,
      cities: filters.value.cities,
      types: filters.value.types,
      audiences: filters.value.audiences,
      dateRange: filters.value.dateRange
    })
  );
  const authStore = useAuthStore();
  const isOwnedByCurrentUser = (event: EventItem) =>
    authStore.userId !== null && event.createdByUserId === authStore.userId;
  const myDraftEvents = computed(() =>
    events.value.filter((event) => event.status === "DRAFT" && isOwnedByCurrentUser(event))
  );
  const myEditorialReviewEvents = computed(() =>
    events.value.filter((event) => event.status === "REJECTED" && isOwnedByCurrentUser(event))
  );
  const myPublishedEvents = computed(() =>
    events.value.filter((event) => event.status === "PUBLISHED" && isOwnedByCurrentUser(event))
  );
  const publishedRevisionDraftEvents = computed(() =>
    myPublishedEvents.value.filter((event) => event.pendingRevision?.status === "DRAFT")
  );
  const publishedRevisionPendingEvents = computed(() =>
    myPublishedEvents.value.filter((event) => event.pendingRevision?.status === "PENDING")
  );
  const publishedRevisionRejectedEvents = computed(() =>
    myPublishedEvents.value.filter((event) => event.pendingRevision?.status === "REJECTED")
  );
  const editableEvents = computed(() => [...myDraftEvents.value, ...myEditorialReviewEvents.value]);
  const publishedBackofficeEvents = computed(() => myPublishedEvents.value);
  const otherEditableEvents = computed(() => {
    if (!authStore.canModerate) {
      return [];
    }

    return events.value.filter((event) => authStore.userId !== null && event.createdByUserId !== authStore.userId);
  });
  const availableCities = computed(() =>
    Array.from(new Set(publishedEvents.value.map((event) => event.city))).sort()
  );
  const availableTypes = computed(() =>
    Array.from(new Set(publishedEvents.value.map((event) => event.categoryId))).sort()
  );

  const getEventById = (id: string) => events.value.find((event) => event.id === id) ?? null;

  const getModerationEventById = (id: string) => {
    const event = getEventById(id);
    if (!event) {
      return null;
    }

    if (event.pendingRevision?.status === "PENDING") {
      return getPendingRevisionSnapshot(event);
    }

    return event.status === "PENDING" ? event : null;
  };

  const getRelatedPublishedEvents = (id: string, limit = 3) => {
    const current = getEventById(id);
    if (!current || !hasResolvedCoordinates(current)) {
      return [];
    }

    const referenceStart = new Date(current.eventStartAt ?? "").getTime();
    const distanceScore = (eventItem: EventItem) =>
      hasResolvedCoordinates(eventItem)
        ? Math.hypot(eventItem.latitude - current.latitude, eventItem.longitude - current.longitude)
        : Number.POSITIVE_INFINITY;
    const timeScore = (eventItem: EventItem) => {
      const eventStart = new Date(eventItem.eventStartAt ?? "").getTime();
      if (Number.isNaN(referenceStart) || Number.isNaN(eventStart)) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.abs(eventStart - referenceStart);
    };

    return publishedEvents.value
      .filter((eventItem) => eventItem.id !== id && hasResolvedCoordinates(eventItem))
      .sort((left, right) => {
        const leftSameCity = left.city === current.city ? 0 : 1;
        const rightSameCity = right.city === current.city ? 0 : 1;
        if (leftSameCity !== rightSameCity) {
          return leftSameCity - rightSameCity;
        }

        const distanceDelta = distanceScore(left) - distanceScore(right);
        if (distanceDelta !== 0) {
          return distanceDelta;
        }

        return timeScore(left) - timeScore(right);
      })
      .slice(0, limit);
  };

  const updateEventState = (updated: EventItem) => {
    const exists = events.value.some((event) => event.id === updated.id);
    events.value = exists
      ? events.value.map((event) => (event.id === updated.id ? updated : event))
      : [updated, ...events.value];
  };

  const removeEventState = (id: string) => {
    events.value = events.value.filter((event) => event.id !== id);
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

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");
  const normalizeText = (value: string) => stripHtml(value).replace(/\s+/g, " ").trim();
  const getEventExcerpt = (eventItem: EventItem) => normalizeText(eventItem.content ?? "");
  const getEventShortExcerpt = (eventItem: EventItem, maxSentences = 2, maxLength = 180) => {
    const excerpt = getEventExcerpt(eventItem);
    if (!excerpt) {
      return "";
    }

    const sentences = excerpt.match(/[^.!?…]+[.!?…]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
    const shortBySentences = sentences.slice(0, maxSentences).join(" ").trim();
    if (shortBySentences) {
      return shortBySentences;
    }

    if (excerpt.length <= maxLength) {
      return excerpt;
    }

    return `${excerpt.slice(0, maxLength).trimEnd()}…`;
  };

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

  const toggleAudience = (audience: string) => {
    const next = new Set(filters.value.audiences);
    if (next.has(audience)) {
      next.delete(audience);
    } else {
      next.add(audience);
    }
    filters.value.audiences = Array.from(next);
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
    const destination = encodeURIComponent(getEventDirectionsQuery(eventItem, eventItem.city));
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  };

  const toIcsDateValue = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  };

  const addDays = (value: string, days: number) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  };

  const buildCalendarUrl = (eventItem: EventItem) => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//rene-website//agenda//FR",
      "BEGIN:VEVENT",
      `UID:${eventItem.id}@rene-website`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${toIcsDateValue(eventItem.eventStartAt ?? "")}`,
      `DTEND;VALUE=DATE:${toIcsDateValue(addDays(eventItem.eventEndAt ?? "", 1))}`,
      `SUMMARY:${eventItem.title}`,
      `LOCATION:${getEventCalendarLocation(eventItem, eventItem.city)}`,
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
      const updated = await publishEventWithFeatured(
        id,
        authStore.role as ModeratorRole,
        featuredEventIds[id] === true
      );
      updateEventState(updated);
      featuredEventIds[id] = updated.featured === true;
    } catch (err) {
      moderationError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const handleUpdateFeatured = async (id: string, featured: boolean) => {
    moderationError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canModerate) return;
    try {
      const updated = await updateEventFeatured(id, authStore.role as ModeratorRole, featured);
      updateEventState(updated);
      featuredEventIds[id] = updated.featured === true;
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

  const handleDelete = async (id: string) => {
    deleteError.value = null;
    const authStore = useAuthStore();
    if (!authStore.canEdit) return;
    try {
      const result = await deleteEvent(id, authStore.role);
      removeEventState(result.id);
    } catch (err) {
      deleteError.value = err instanceof Error ? err.message : "Erreur inconnue";
    }
  };

  const setRejectionReason = (id: string, value: string) => {
    rejectionReasons[id] = value;
  };

  const setFeaturedEvent = (id: string, featured: boolean) => {
    featuredEventIds[id] = featured;
  };

  const getModerationError = () => moderationError.value;
  const getDeleteError = () => deleteError.value;

  return {
    events,
    isLoading,
    error,
    moderationError,
    imageErrorById,
    rejectionReasons,
    featuredEventIds,
    filters,
    deleteError,
    publishedEvents,
    pendingEvents,
    filteredEvents,
    myDraftEvents,
    myEditorialReviewEvents,
    myPublishedEvents,
    publishedRevisionDraftEvents,
    publishedRevisionPendingEvents,
    publishedRevisionRejectedEvents,
    editableEvents,
    publishedBackofficeEvents,
    otherEditableEvents,
    availableCities,
    availableTypes,
    getEventById,
    getModerationEventById,
    getEditionSnapshot,
    getRelatedPublishedEvents,
    getGeolocationPrecision,
    hasResolvedCoordinates,
    hasApproximateGeolocation,
    canSubmitForModeration,
    updateEventState,
    fetchEvents: fetchEventsData,
    markImageError,
    getEventImage,
    getEventExcerpt,
    getEventShortExcerpt,
    toggleCity,
    toggleType,
    toggleAudience,
    handleDateRangeChange,
    applyPreset,
    resetFilters,
    formatDate,
    formatDateRange,
    formatDateTimeRange,
    formatUpdatedAtLabel,
    formatOptional,
    formatDateTimeInput,
    buildDirectionsUrl,
    buildCalendarUrl,
    handlePublish,
    handleUpdateFeatured,
    handleReject,
    handleDelete,
    setFeaturedEvent,
    setRejectionReason,
    getModerationError,
    getDeleteError
  };
});
