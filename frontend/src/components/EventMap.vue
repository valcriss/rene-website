<template>
  <div class="h-80 w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm sm:h-96 xl:h-[420px]">
    <div ref="mapContainer" class="h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import * as L from "leaflet";
import type { EventItem } from "../api/events";
import { formatDateRange } from "../utils/formatters";

const props = defineProps<{ events: EventItem[]; selectedId?: string | null }>();
const emit = defineEmits<{ (event: "select", id: string): void }>();

const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = ref<L.Map | null>(null);
const markersLayer = ref<L.LayerGroup>(L.layerGroup());
const markersById = new Map<string, L.Marker>();

const defaultCenter = { lat: 46.972, lng: 0.705 };
const defaultZoom = 12;

const hasCoordinates = (event: EventItem) =>
  typeof event.latitude === "number" &&
  Number.isFinite(event.latitude) &&
  typeof event.longitude === "number" &&
  Number.isFinite(event.longitude);

const updateMarkers = (items: EventItem[]) => {
  markersLayer.value.clearLayers();
  markersById.clear();

  items.filter(hasCoordinates).forEach((event) => {
    const marker = L.marker([event.latitude, event.longitude]);
    marker.bindPopup(`<strong>${event.title}</strong><br/>${event.venueName}`);
    marker.bindTooltip(`<strong>${event.title}</strong><br/>${formatDateRange(event.eventStartAt, event.eventEndAt)}`);
    marker.on("click", () => emit("select", event.id));
    marker.addTo(markersLayer.value as L.LayerGroup);
    markersById.set(event.id, marker);
  });
};

const fitToMarkers = (items: EventItem[]) => {
  const map = mapInstance.value as L.Map;
  const geocodedItems = items.filter(hasCoordinates);

  if (geocodedItems.length === 0) {
    map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    return;
  }
  if (geocodedItems.length === 1) {
    map.setView([geocodedItems[0].latitude, geocodedItems[0].longitude], 13);
    return;
  }
  const bounds = L.latLngBounds(
    geocodedItems.map((event) => [event.latitude, event.longitude] as L.LatLngExpression)
  );
  map.fitBounds(bounds, { padding: [24, 24] });
};

const openSelectedMarker = () => {
  if (!props.selectedId || !mapInstance.value) return;
  const marker = markersById.get(props.selectedId);
  if (!marker) return;
  marker.openPopup();
  mapInstance.value.setView(marker.getLatLng(), 13);
};

onMounted(() => {
  const map = L.map(mapContainer.value as HTMLDivElement).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  mapInstance.value = map;
  markersLayer.value.addTo(map);
  updateMarkers(props.events);
  fitToMarkers(props.events);
  openSelectedMarker();
});

watch(
  () => props.events,
  (items) => {
    updateMarkers(items);
    fitToMarkers(items);
    openSelectedMarker();
  }
);

watch(
  () => props.selectedId,
  () => openSelectedMarker()
);

onBeforeUnmount(() => {
  if (mapInstance.value) {
    mapInstance.value.remove();
  }
});
</script>
