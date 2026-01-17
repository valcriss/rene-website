import { render } from "@testing-library/vue";
import { vi } from "vitest";
import EventMap from "../src/components/EventMap.vue";

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
  map: vi.fn(() => mapInstance),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  layerGroup: vi.fn(() => layerGroupInstance),
  latLngBounds: vi.fn(() => ({ isValid: () => true })),
  marker: vi.fn(() => markerInstance)
}));

describe("EventMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders markers", () => {
    const { unmount } = render(EventMap, {
      props: {
        events: [
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "img",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PUBLISHED"
          }
        ]
      }
    });

    expect(layerGroupInstance.addTo).toHaveBeenCalled();
    expect(layerGroupInstance.clearLayers).toHaveBeenCalled();
    expect(markerInstance.bindPopup).toHaveBeenCalled();
    expect(markerInstance.bindTooltip).toHaveBeenCalled();

    unmount();
    expect(mapInstance.remove).toHaveBeenCalled();
  });

  it("opens the selected marker", () => {
    render(EventMap, {
      props: {
        selectedId: "1",
        events: [
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "img",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PUBLISHED"
          }
        ]
      }
    });

    expect(markerInstance.openPopup).toHaveBeenCalled();
    expect(mapInstance.setView).toHaveBeenCalledWith({ lat: 46.97, lng: 0.7 }, 13);
  });

  it("ignores selection without marker", () => {
    render(EventMap, {
      props: {
        selectedId: "missing",
        events: []
      }
    });

    expect(markerInstance.openPopup).not.toHaveBeenCalled();
  });

  it("updates markers when events change", async () => {
    const { rerender } = render(EventMap, {
      props: {
        events: []
      }
    });

    await rerender({
      events: [
        {
          id: "1",
          title: "Concert",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          venueName: "Salle",
          city: "Descartes",
          image: "img",
          categoryId: "music",
          latitude: 46.97,
          longitude: 0.7,
          status: "PUBLISHED"
        },
        {
          id: "2",
          title: "Expo",
          eventStartAt: "2026-01-16T10:00:00.000Z",
          eventEndAt: "2026-01-16T12:00:00.000Z",
          venueName: "Galerie",
          city: "Tours",
          image: "img",
          categoryId: "art",
          latitude: 47,
          longitude: 0.69,
          status: "PUBLISHED"
        }
      ]
    });

    expect(layerGroupInstance.clearLayers).toHaveBeenCalledTimes(2);
    expect(mapInstance.fitBounds).toHaveBeenCalled();
  });

  it("recenters when events are cleared", async () => {
    const { rerender } = render(EventMap, {
      props: {
        events: [
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "img",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PUBLISHED"
          }
        ]
      }
    });

    mapInstance.setView.mockClear();

    await rerender({ events: [] });

    expect(mapInstance.setView).toHaveBeenCalledWith([46.972, 0.705], 12);
  });

  it("uses fallback date format when dates are invalid", () => {
    render(EventMap, {
      props: {
        events: [
          {
            id: "1",
            title: "Concert",
            eventStartAt: "invalid",
            eventEndAt: "invalid",
            venueName: "Salle",
            city: "Descartes",
            image: "img",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PUBLISHED"
          }
        ]
      }
    });

    const tooltipArg = markerInstance.bindTooltip.mock.calls[0]?.[0] ?? "";
    expect(tooltipArg).toContain("Invalid");
  });

  it("renders range label when dates span multiple days", () => {
    render(EventMap, {
      props: {
        events: [
          {
            id: "1",
            title: "Festival",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-16T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "img",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PUBLISHED"
          }
        ]
      }
    });

    const tooltipArg = markerInstance.bindTooltip.mock.calls[0]?.[0] ?? "";
    expect(tooltipArg).toContain("→");
  });
});
