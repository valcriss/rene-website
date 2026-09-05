<template>
  <div class="h-80 w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm sm:h-96 xl:h-[420px]">
    <div ref="mapContainer" class="h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import * as L from "leaflet";
import type { EventMapPin } from "../utils/mapPins";

const props = defineProps<{ pins: EventMapPin[]; selectedId?: string | null }>();
const emit = defineEmits<{ (event: "select", id: string): void }>();

const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = ref<L.Map | null>(null);
const markersLayer = ref<L.LayerGroup>(L.layerGroup());
const markersByEventId = new Map<string, L.Marker>();

const defaultCenter = { lat: 46.972, lng: 0.705 };
const defaultZoom = 12;
const markerIcon = L.icon({
  iconUrl: "/mark.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28]
});

const updateMarkers = (pins: EventMapPin[]) => {
  markersLayer.value.clearLayers();
  markersByEventId.clear();

  pins.forEach((pin) => {
    const marker = L.marker([pin.latitude, pin.longitude], { icon: markerIcon });
    marker.bindPopup(pin.popupHtml);
    marker.bindTooltip(pin.tooltipHtml);
    marker.on("click", () => emit("select", pin.eventId));
    marker.addTo(markersLayer.value as L.LayerGroup);
    markersByEventId.set(pin.eventId, marker);
  });
};

const fitToMarkers = (pins: EventMapPin[]) => {
  const map = mapInstance.value as L.Map;

  if (pins.length === 0) {
    map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    return;
  }
  if (pins.length === 1) {
    map.setView([pins[0].latitude, pins[0].longitude], 13);
    return;
  }
  const bounds = L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as L.LatLngExpression));
  map.fitBounds(bounds, { padding: [24, 24] });
};

const openSelectedMarker = () => {
  if (!props.selectedId || !mapInstance.value) return;
  const marker = markersByEventId.get(props.selectedId);
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
  updateMarkers(props.pins);
  fitToMarkers(props.pins);
  openSelectedMarker();
});

watch(
  () => props.pins,
  (pins) => {
    updateMarkers(pins);
    fitToMarkers(pins);
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
