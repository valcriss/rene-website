import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";
import EventDetailPage from "../src/pages/EventDetailPage.vue";
import { useEventsStore } from "../src/stores/events";
import { createTestRouter } from "./testRouter";

const makeWrapper = async () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const eventsStore = useEventsStore();
  eventsStore.events = [
    {
      id: "123",
      title: "Concert",
      content: "Soirée",
      image: null,
      categoryId: null,
      audienceId: null,
      occurrences: [],
      organizerName: null,
      status: "PUBLISHED",
      slug: "concert-descartes-2026"
    },
    {
      id: "42",
      title: "Autre événement",
      content: "Contenu",
      image: null,
      categoryId: null,
      audienceId: null,
      occurrences: [],
      organizerName: null,
      status: "PUBLISHED",
      slug: "autre-evenement-descartes-2026"
    }
  ];

  const router = createTestRouter("/evenements/concert-descartes-2026");
  await router.isReady();
  const wrapper = mount(EventDetailPage, {
    global: {
      plugins: [router, pinia],
      stubs: {
        NavigationHeader: {
          template: "<button data-testid='login' @click=\"$emit('login')\"></button>"
        },
        EventDetailView: {
          template:
            "<div><slot name='header'></slot><button data-testid='select' @click=\"$emit('select','42')\"></button></div>"
        }
      }
    }
  });
  return { router, wrapper };
};

describe("EventDetailPage", () => {
  it("navigates using header actions", async () => {
    const { router, wrapper } = await makeWrapper();
    const pushSpy = vi.spyOn(router, "push");

    const backToAgendaLink = wrapper
      .findAll("a")
      .find((link) => link.text().includes("Retour"));
    if (!backToAgendaLink) {
      throw new Error("Back to agenda link not found");
    }
    expect(backToAgendaLink.attributes("href")).toBe("/");
    await backToAgendaLink.trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/");

    await wrapper.find("[data-testid='login']").trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/login");

    await wrapper.find("[data-testid='select']").trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/evenements/autre-evenement-descartes-2026");
  });
});
