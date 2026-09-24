import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import HomePage from "../src/pages/HomePage.vue";
import { useEventsStore } from "../src/stores/events";
import { useCategoriesStore } from "../src/stores/categories";
import { createTestRouter } from "./testRouter";
import type { EventItem, EventOccurrence } from "../src/api/events";
import { vi } from "vitest";

const buildOccurrence = (overrides: Partial<EventOccurrence> = {}): EventOccurrence => ({
  id: "occ-1",
  eventStartAt: "2030-01-15T20:00:00.000Z",
  eventEndAt: "2030-01-15T22:00:00.000Z",
  allDay: false,
  venueName: "Salle",
  address: "",
  postalCode: "",
  city: "Descartes",
  latitude: 46.97,
  longitude: 0.7,
  ...overrides
});

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert",
  content: "Première phrase. Deuxième phrase. Troisième phrase inutile.",
  image: "img",
  categoryId: "music",
  audienceId: null,
  occurrences: [buildOccurrence()],
  organizerName: "Org",
  status: "PUBLISHED",
  publishedAt: null,
  publicationEndAt: "2030-01-15T22:00:00.000Z",
  rejectionReason: null,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
  ...overrides
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

    const eventCardLink = wrapper.get("[data-testid='event-card-1']");
    expect(eventCardLink.element.tagName).toBe("A");
    expect(eventCardLink.attributes("href")).toBe("/event/1");
    await eventCardLink.trigger("click");
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
      buildEvent({
        id: "2",
        title: "Expo",
        occurrences: [
          buildOccurrence({ id: "occ-2", eventStartAt: "2030-01-16T20:00:00.000Z", eventEndAt: "2030-01-16T22:00:00.000Z" })
        ]
      })
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

    const featuredLink = wrapper.get("[data-testid='featured-card-link-1']");
    expect(featuredLink.element.tagName).toBe("A");
    expect(featuredLink.attributes("href")).toBe("/event/1");
    expect(featuredLink.attributes("aria-label")).toBe("Concert");

    await wrapper.get("button[aria-label='Événement suivant']").trigger("click");

    expect(wrapper.find("[data-testid='featured-card-2']").exists()).toBe(true);
  });

  it("shows the multisite badge only when occurrences are at distinct addresses", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    eventsStore.isLoading = false;
    eventsStore.error = null;
    eventsStore.events = [
      buildEvent({ id: "single-site" }),
      buildEvent({
        id: "multi-site",
        title: "Festival",
        occurrences: [
          buildOccurrence({ id: "occ-a", address: "1 rue du Centre" }),
          buildOccurrence({ id: "occ-b", address: "8 place de la Mairie", eventStartAt: "2030-01-16T20:00:00.000Z" })
        ]
      })
    ];
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

    const singleSiteCard = wrapper.get("[data-testid='event-card-single-site']");
    expect(singleSiteCard.text()).not.toContain("Multisite");

    const multiSiteCard = wrapper.get("[data-testid='event-card-multi-site']");
    expect(multiSiteCard.text()).toContain("Multisite");
  });

  it("uses the image alt text when available, falling back to the title otherwise", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    eventsStore.isLoading = false;
    eventsStore.error = null;
    eventsStore.events = [
      buildEvent({ id: "with-alt", imageAlt: "Public au concert" }),
      buildEvent({ id: "without-alt", title: "Festival" })
    ];
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

    expect(wrapper.get("[data-testid='event-card-with-alt'] img").attributes("alt")).toBe("Public au concert");
    expect(wrapper.get("[data-testid='event-card-without-alt'] img").attributes("alt")).toBe("Festival");
  });
});
