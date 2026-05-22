import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import HomePage from "../src/pages/HomePage.vue";
import { useEventsStore } from "../src/stores/events";
import { useCategoriesStore } from "../src/stores/categories";
import { createTestRouter } from "./testRouter";
import type { EventItem } from "../src/api/events";
import { vi } from "vitest";

const buildEvent = (): EventItem => ({
  id: "1",
  title: "Concert",
  content: "Première phrase. Deuxième phrase. Troisième phrase inutile.",
  image: "img",
  categoryId: "music",
  eventStartAt: "2030-01-15T20:00:00.000Z",
  eventEndAt: "2030-01-15T22:00:00.000Z",
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
  publicationEndAt: "2030-01-15T22:00:00.000Z",
  rejectionReason: null,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z"
});

describe("HomePage", () => {
  it("navigates to login and event detail", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    eventsStore.isLoading = false;
    eventsStore.error = null;
    eventsStore.events = [buildEvent()];
    categoriesStore.hasLoaded = true;

    const router = createTestRouter("/");
    await router.isReady();
    const pushSpy = vi.spyOn(router, "push");

    const wrapper = mount(HomePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          HomeFilters: { template: "<div></div>" },
          HomeSearch: { template: "<div></div>" },
          HomeTitle: { template: "<div></div>" },
          EventMap: {
            template: "<button data-testid='map-select' @click=\"$emit('select','1')\"></button>"
          },
          NavigationHeader: {
            template: "<button data-testid='login' @click=\"$emit('login')\"></button>"
          }
        }
      }
    });

    await wrapper.find("[data-testid='login']").trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/login");

    await wrapper.find("[data-testid='event-card-1']").trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/event/1");

    expect(wrapper.get("[data-testid='event-grid']").classes()).toContain("xl:grid-cols-3");
    expect(wrapper.text()).toContain("Première phrase. Deuxième phrase.");
    expect(wrapper.text()).not.toContain("Troisième phrase inutile.");
    expect(wrapper.text()).toContain("Mis à jour le");
  });

  it("shows featured carousel controls and keeps featured items in the grid", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    eventsStore.isLoading = false;
    eventsStore.error = null;
    eventsStore.events = [
      buildEvent(),
      { ...buildEvent(), id: "2", title: "Expo", featured: true, eventStartAt: "2030-01-16T20:00:00.000Z", eventEndAt: "2030-01-16T22:00:00.000Z" }
    ].map((eventItem) => ({ ...eventItem, featured: true }));
    categoriesStore.hasLoaded = true;

    const router = createTestRouter("/");
    await router.isReady();

    const wrapper = mount(HomePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          HomeFilters: { template: "<div></div>" },
          HomeSearch: { template: "<div></div>" },
          HomeTitle: { template: "<div></div>" },
          EventMap: { template: "<div></div>" },
          NavigationHeader: { template: "<div></div>" }
        }
      }
    });

    expect(wrapper.find("[data-testid='featured-card-1']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='event-card-1']").exists()).toBe(true);

    await wrapper.get("button[aria-label='Événement suivant']").trigger("click");

    expect(wrapper.find("[data-testid='featured-card-2']").exists()).toBe(true);
  });
});
