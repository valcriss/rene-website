import { render } from "@testing-library/vue";
import * as L from "leaflet";
import { vi } from "vitest";
import EventMap from "../src/components/EventMap.vue";
import type { EventMapPin } from "../src/utils/mapPins";

type LeafletMap = {
  setView: ReturnType<typeof vi.fn>;
  fitBounds: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

type LeafletLayer = {
  addTo: ReturnType<typeof vi.fn>;
  clearLayers: ReturnType<typeof vi.fn>;
};

const mapInstance: LeafletMap = {
  setView: vi.fn().mockReturnThis(),
  fitBounds: vi.fn().mockReturnThis(),
  remove: vi.fn()
};

const layerGroupInstance: LeafletLayer = {
  addTo: vi.fn().mockReturnThis(),
  clearLayers: vi.fn()
};

const markerInstance = {
  bindPopup: vi.fn().mockReturnThis(),
  bindTooltip: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  openPopup: vi.fn().mockReturnThis(),
  getLatLng: vi.fn(() => ({ lat: 46.97, lng: 0.7 }))
};

vi.mock("leaflet", () => ({
  icon: vi.fn((options) => ({ options })),
  map: vi.fn(() => mapInstance),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  layerGroup: vi.fn(() => layerGroupInstance),
  latLngBounds: vi.fn(() => ({ isValid: () => true })),
  marker: vi.fn(() => markerInstance)
}));

const buildPin = (overrides: Partial<EventMapPin> = {}): EventMapPin => ({
  id: "1:occ-1",
  eventId: "1",
  latitude: 46.97,
  longitude: 0.7,
  popupHtml: "<strong>Concert</strong><br/>Salle, Descartes",
  tooltipHtml: "<strong>Concert</strong><br/>15 janvier 2026",
  ...overrides
});

describe("EventMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders markers", () => {
    const { unmount } = render(EventMap, {
      props: {
        pins: [buildPin()]
      }
    });

    expect(layerGroupInstance.addTo).toHaveBeenCalled();
    expect(layerGroupInstance.clearLayers).toHaveBeenCalled();
    expect(L.icon).toHaveBeenCalledWith({
      iconUrl: "/mark.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28]
    });
    expect(L.marker).toHaveBeenCalledWith([46.97, 0.7], {
      icon: {
        options: {
          iconUrl: "/mark.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          tooltipAnchor: [16, -28]
        }
      }
    });
    expect(markerInstance.bindPopup).toHaveBeenCalledWith("<strong>Concert</strong><br/>Salle, Descartes");
    expect(markerInstance.bindTooltip).toHaveBeenCalledWith("<strong>Concert</strong><br/>15 janvier 2026");

    unmount();
    expect(mapInstance.remove).toHaveBeenCalled();
  });

  it("opens the selected marker", () => {
    render(EventMap, {
      props: {
        selectedId: "1",
        pins: [buildPin()]
      }
    });

    expect(markerInstance.openPopup).toHaveBeenCalled();
    expect(mapInstance.setView).toHaveBeenCalledWith({ lat: 46.97, lng: 0.7 }, 13);
  });

  it("ignores selection without marker", () => {
    render(EventMap, {
      props: {
        selectedId: "missing",
        pins: []
      }
    });

    expect(markerInstance.openPopup).not.toHaveBeenCalled();
  });

  it("updates markers when pins change", async () => {
    const { rerender } = render(EventMap, {
      props: {
        pins: []
      }
    });

    await rerender({
      pins: [buildPin({ id: "1:occ-1" }), buildPin({ id: "2:occ-1", eventId: "2", latitude: 47, longitude: 0.69 })]
    });

    expect(layerGroupInstance.clearLayers).toHaveBeenCalledTimes(2);
    expect(mapInstance.fitBounds).toHaveBeenCalled();
  });

  it("shows a single marker centered without bounds fitting", async () => {
    const { rerender } = render(EventMap, {
      props: {
        pins: []
      }
    });

    mapInstance.setView.mockClear();

    await rerender({ pins: [buildPin()] });

    expect(mapInstance.setView).toHaveBeenCalledWith([46.97, 0.7], 13);
  });

  it("recenters when pins are cleared", async () => {
    const { rerender } = render(EventMap, {
      props: {
        pins: [buildPin()]
      }
    });

    mapInstance.setView.mockClear();

    await rerender({ pins: [] });

    expect(mapInstance.setView).toHaveBeenCalledWith([46.972, 0.705], 12);
  });

  it("emits select with the pin's event id when a marker is clicked", () => {
    const { emitted } = render(EventMap, {
      props: {
        pins: [buildPin({ eventId: "42" })]
      }
    });

    const clickHandler = markerInstance.on.mock.calls.find(([eventName]) => eventName === "click")?.[1];
    clickHandler?.();

    expect(emitted().select?.[0]).toEqual(["42"]);
  });
});
