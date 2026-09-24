import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import RelatedEvents from "../src/components/events/RelatedEvents.vue";
import { useCategoriesStore } from "../src/stores/categories";
import { useEventsStore } from "../src/stores/events";
import { createTestRouter } from "./testRouter";

describe("RelatedEvents", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders a real, crawlable link for each card and emits on click", async () => {
    const categoriesStore = useCategoriesStore();
    const eventsStore = useEventsStore();
    categoriesStore.categories = [];
    eventsStore.events = [];
    const router = createTestRouter("/");
    await router.isReady();

    const wrapper = mount(RelatedEvents, {
      global: { plugins: [router] },
      props: {
        events: [
          {
            id: "1",
            title: "Lecture",
            content: "<p>Contenu</p>",
            image: "",
            categoryId: "unknown",
            audienceId: null,
            occurrences: [
              {
                id: "occ-1",
                eventStartAt: "2030-01-15T20:00:00.000Z",
                eventEndAt: "2030-01-15T22:00:00.000Z",
                allDay: false,
                venueName: "Salle",
                address: null,
                postalCode: null,
                city: "Descartes",
                latitude: 46.97,
                longitude: 0.7
              }
            ],
            organizerName: null,
            status: "PUBLISHED"
          }
        ]
      }
    });

    const card = wrapper.get('[data-testid="related-event-card-1"]');
    expect(card.element.tagName).toBe("A");
    expect(card.attributes("href")).toBe("/event/1");
    expect(card.text()).not.toContain("unknown");
    expect(card.text()).toContain("Lecture");
    expect(wrapper.text()).toContain("Contenu");

    await card.trigger("click");
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
