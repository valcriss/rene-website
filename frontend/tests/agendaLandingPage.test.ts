import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AgendaLandingPage from "../src/pages/AgendaLandingPage.vue";
import { useCategoriesStore } from "../src/stores/categories";
import { useEventsStore } from "../src/stores/events";
import { createTestRouter } from "./testRouter";
import type { EventItem } from "../src/api/events";

const FUTURE_START = "2099-01-15T20:00:00.000Z";
const FUTURE_END = "2099-01-15T22:00:00.000Z";

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert de jazz",
  content: "<p>Une soirée jazz.</p>",
  image: "img",
  categoryId: "music",
  audienceId: null,
  occurrences: [
    {
      id: "occ-1",
      venueName: "Salle",
      address: "",
      postalCode: "",
      city: "Descartes",
      eventStartAt: FUTURE_START,
      eventEndAt: FUTURE_END,
      allDay: false
    }
  ],
  organizerName: null,
  status: "PUBLISHED",
  ...overrides
});

const mountAgendaPage = async (path: string, events: EventItem[]) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const eventsStore = useEventsStore();
  eventsStore.events = events;
  eventsStore.isLoading = false;
  const categoriesStore = useCategoriesStore();
  categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];

  const router = createTestRouter(path);
  await router.isReady();

  const wrapper = mount(AgendaLandingPage, {
    global: {
      plugins: [pinia, router],
      stubs: { NavigationHeader: { template: "<div></div>" } }
    }
  });
  await wrapper.vm.$nextTick();
  return wrapper;
};

describe("AgendaLandingPage", () => {
  it("renders the weekend agenda with matching events", async () => {
    const wrapper = await mountAgendaPage("/agenda/ce-week-end", [buildEvent({ occurrences: [] })]);

    expect(wrapper.text()).toContain("L'agenda du week-end");
    expect(wrapper.find("[data-testid='agenda-landing-list']").exists()).toBe(false);
    expect(wrapper.text()).toContain("Aucun événement ne correspond");
  });

  it("renders the city agenda with a real city name and matching events", async () => {
    const wrapper = await mountAgendaPage("/agenda/ville/descartes", [buildEvent()]);

    expect(wrapper.text()).toContain("Agenda de Descartes");
    const card = wrapper.find("[data-testid='agenda-landing-card-1']");
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain("Concert de jazz");
  });

  it("falls back to a humanized name for a city with no currently active event", async () => {
    const wrapper = await mountAgendaPage("/agenda/ville/la-fleche", []);

    expect(wrapper.text()).toContain("Agenda de La Fleche");
    expect(wrapper.text()).toContain("Aucun événement ne correspond");
  });

  it("renders the category agenda with the real category name and matching events", async () => {
    const wrapper = await mountAgendaPage("/agenda/categorie/music", [buildEvent()]);

    expect(wrapper.text()).toContain("Musique");
    const card = wrapper.find("[data-testid='agenda-landing-card-1']");
    expect(card.exists()).toBe(true);
  });

  it("excludes events belonging to a different city/category", async () => {
    const wrapper = await mountAgendaPage("/agenda/ville/descartes", [
      buildEvent({
        id: "2",
        title: "Autre ville",
        occurrences: [
          {
            id: "occ-2",
            venueName: null,
            address: null,
            postalCode: null,
            city: "Tours",
            eventStartAt: FUTURE_START,
            eventEndAt: FUTURE_END,
            allDay: false
          }
        ]
      })
    ]);

    expect(wrapper.find("[data-testid='agenda-landing-card-2']").exists()).toBe(false);
    expect(wrapper.text()).toContain("Aucun événement ne correspond");
  });

  it("excludes an event that has already ended", async () => {
    const wrapper = await mountAgendaPage("/agenda/ville/descartes", [
      buildEvent({
        occurrences: [
          {
            id: "occ-1",
            venueName: null,
            address: null,
            postalCode: null,
            city: "Descartes",
            eventStartAt: "2020-01-15T20:00:00.000Z",
            eventEndAt: "2020-01-15T22:00:00.000Z",
            allDay: false
          }
        ]
      })
    ]);

    expect(wrapper.find("[data-testid='agenda-landing-card-1']").exists()).toBe(false);
  });

  it("links back to the full agenda from the empty state", async () => {
    const wrapper = await mountAgendaPage("/agenda/ville/paris", []);

    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("/");
  });
});
