<template>
  <div class="h-80 w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm sm:h-96 xl:h-[420px]">
    <div ref="mapContainer" class="h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import type * as Leaflet from "leaflet";
import type { EventMapPin } from "../utils/mapPins";

const props = defineProps<{ pins: EventMapPin[]; selectedId?: string | null }>();
const emit = defineEmits<{ (event: "select", id: string): void }>();

const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = ref<Leaflet.Map | null>(null);
const markersByEventId = new Map<string, Leaflet.Marker>();

const defaultCenter = { lat: 46.972, lng: 0.705 };
const defaultZoom = 12;

// Leaflet touches `window`/`document` as soon as it's evaluated, so it's only ever imported
// from inside onMounted (never during SSR, where onMounted callbacks don't run at all).
let L: typeof Leaflet | null = null;
let markersLayer: Leaflet.LayerGroup | null = null;
let markerIcon: Leaflet.Icon | null = null;

const updateMarkers = (pins: EventMapPin[]) => {
  if (!L || !markersLayer) return;
  markersLayer.clearLayers();
  markersByEventId.clear();

  pins.forEach((pin) => {
    const marker = L!.marker([pin.latitude, pin.longitude], { icon: markerIcon! });
    marker.bindPopup(pin.popupHtml);
    marker.bindTooltip(pin.tooltipHtml);
    marker.on("click", () => emit("select", pin.eventId));
    marker.addTo(markersLayer as Leaflet.LayerGroup);
    markersByEventId.set(pin.eventId, marker);
  });
};

const fitToMarkers = (pins: EventMapPin[]) => {
  if (!L || !mapInstance.value) return;
  const map = mapInstance.value;

  if (pins.length === 0) {
    map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    return;
  }
  if (pins.length === 1) {
    map.setView([pins[0].latitude, pins[0].longitude], 13);
    return;
  }
  const bounds = L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as Leaflet.LatLngExpression));
  map.fitBounds(bounds, { padding: [24, 24] });
};

const openSelectedMarker = () => {
  if (!props.selectedId || !mapInstance.value) return;
  const marker = markersByEventId.get(props.selectedId);
  if (!marker) return;
  marker.openPopup();
  mapInstance.value.setView(marker.getLatLng(), 13);
};

const initMap = async () => {
  L = await import("leaflet");
  markerIcon = L.icon({
    iconUrl: "/mark.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28]
  });
  markersLayer = L.layerGroup();

  const map = L.map(mapContainer.value as HTMLDivElement).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  mapInstance.value = map;
  markersLayer.addTo(map);
  updateMarkers(props.pins);
  fitToMarkers(props.pins);
  openSelectedMarker();
};

let intersectionObserver: IntersectionObserver | null = null;

// Leaflet (and its tile requests) are only worth the network/CPU cost once the map is actually
// about to be seen — this keeps it out of the critical path for events far below the fold.
// rootMargin starts loading slightly ahead of the viewport so the map is ready by the time it
// scrolls into view, rather than popping in empty.
onMounted(() => {
  if (typeof IntersectionObserver === "undefined" || !mapContainer.value) {
    void initMap();
    return;
  }

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      intersectionObserver?.disconnect();
      intersectionObserver = null;
      void initMap();
    },
    { rootMargin: "200px" }
  );
  intersectionObserver.observe(mapContainer.value);
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
  intersectionObserver?.disconnect();
  if (mapInstance.value) {
    mapInstance.value.remove();
  }
});
</script>
