import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import RelatedEvents from "../src/components/events/RelatedEvents.vue";
import { useCategoriesStore } from "../src/stores/categories";
import { useEventsStore } from "../src/stores/events";

describe("RelatedEvents", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders fallback category theme and emits from keyboard", async () => {
    const categoriesStore = useCategoriesStore();
    const eventsStore = useEventsStore();
    categoriesStore.categories = [];
    eventsStore.events = [];

    const wrapper = mount(RelatedEvents, {
      props: {
        events: [
          {
            id: "1",
            title: "Lecture",
            content: "<p>Contenu</p>",
            image: "",
            categoryId: "unknown",
            eventStartAt: "2030-01-15T20:00:00.000Z",
            eventEndAt: "2030-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7,
            status: "PUBLISHED"
          }
        ]
      }
    });

    const card = wrapper.get('[data-testid="related-event-card-1"]');
    expect(card.text()).not.toContain("unknown");
    expect(wrapper.text()).toContain("Contenu");

    await card.trigger("keydown.enter");
    expect(wrapper.emitted("select")?.[0]).toEqual(["1"]);

    const setupState = (wrapper.vm as {
      $: {
        setupState: {
          getCategoryName: (categoryId: string) => string;
          getCategoryTheme: (categoryId: string) => { color: string };
        };
      };
    }).$.setupState;

    expect(setupState.getCategoryName("missing")).toBe("");
    expect(setupState.getCategoryTheme("missing").color).toBe("#1e3a8a");
  });
});
