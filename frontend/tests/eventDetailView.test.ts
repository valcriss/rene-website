import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import EventDetailView from "../src/components/events/EventDetailView.vue";
import { useEventsStore } from "../src/stores/events";

describe("EventDetailView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders fallback content and emits selection", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert",
        content: "",
        image: "img",
        categoryId: "music",
        eventStartAt: "2026-01-15T20:00:00.000Z",
        eventEndAt: "2026-01-15T22:00:00.000Z",
        allDay: false,
        venueName: "Salle",
        address: "",
        postalCode: "",
        city: "Descartes",
        latitude: 46.97,
        longitude: 0.7,
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2026-01-15T22:00:00.000Z",
        rejectionReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const wrapper = mount(EventDetailView, {
      props: { eventId: "1" },
      global: {
        plugins: [pinia],
        stubs: {
          EventMap: {
            template: "<button data-testid='map-select' @click=\"$emit('select','1')\"></button>"
          }
        }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.html()).toContain("Non renseigné");

    await wrapper.find("img").trigger("error");
    expect(eventsStore.imageErrorById["1"]).toBe(true);

    await wrapper.find("[data-testid='map-select']").trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
  });

  it("exposes emitSelect helper", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert",
        content: "<p>Texte</p>",
        image: "img",
        categoryId: "music",
        eventStartAt: "2026-01-15T20:00:00.000Z",
        eventEndAt: "2026-01-15T22:00:00.000Z",
        allDay: false,
        venueName: "Salle",
        address: "",
        postalCode: "",
        city: "Descartes",
        latitude: 46.97,
        longitude: 0.7,
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2026-01-15T22:00:00.000Z",
        rejectionReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const wrapper = mount(EventDetailView, {
      props: { eventId: "1" },
      global: {
        plugins: [pinia],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    await wrapper.vm.$nextTick();

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { emitSelect: (id: string) => void } };
    }).$.setupState;
    expect(wrapper.html()).toContain("Texte");
    setupState.emitSelect("1");
    expect(wrapper.emitted("select")).toBeTruthy();
  });
});
