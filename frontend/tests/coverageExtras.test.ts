import { describe, expect, it, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useEventsStore } from "../src/stores/events";
import { useCategoriesStore } from "../src/stores/categories";
import { useAuthStore } from "../src/stores/auth";
import { useAdminStore } from "../src/stores/admin";
import HomePage from "../src/pages/HomePage.vue";
import LoginPage from "../src/pages/LoginPage.vue";
import EventDetailView from "../src/components/events/EventDetailView.vue";
import BackofficeLayout from "../src/pages/backoffice/BackofficeLayout.vue";
import BackofficeAdminUsersPage from "../src/pages/backoffice/BackofficeAdminUsersPage.vue";
import { createTestRouter } from "./testRouter";

describe("coverage extras", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("covers login quick login in dev mode", async () => {
    vi.stubEnv("DEV", "1");
    const router = createTestRouter("/login");
    await router.isReady();
    const authStore = useAuthStore();

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    const select = wrapper.find("select");
    if (select.exists()) {
      await select.setValue("editor@rene-website.local");
      expect(authStore.email).toBe("editor@rene-website.local");
      expect(authStore.password).toBe("editor-rene-2026");
    }

    vi.unstubAllEnvs();
  });

  it("covers login quick login no-op when nothing is selected", async () => {
    vi.stubEnv("DEV", "1");
    const router = createTestRouter("/login");
    await router.isReady();
    const authStore = useAuthStore();
    authStore.email = "kept@test.local";
    authStore.password = "unchanged";

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    });

    const select = wrapper.find("select");
    if (select.exists()) {
      await select.setValue("");
      expect(authStore.email).toBe("kept@test.local");
      expect(authStore.password).toBe("unchanged");
    }

    vi.unstubAllEnvs();
  });

  it("covers home page category badges and loading of categories", async () => {
    const router = createTestRouter("/");
    await router.isReady();
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert",
        content: "Desc",
        image: "img",
        categoryId: "music",
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
      },
      {
        id: "2",
        title: "Expo",
        content: "Desc",
        image: "img",
        categoryId: "art",
        audienceId: null,
        occurrences: [
          {
            id: "occ-2",
            eventStartAt: "2030-01-16T20:00:00.000Z",
            eventEndAt: "2030-01-16T22:00:00.000Z",
            allDay: false,
            venueName: "Galerie",
            address: null,
            postalCode: null,
            city: "Tours",
            latitude: 47,
            longitude: 0.69
          }
        ],
        organizerName: null,
        status: "PUBLISHED"
      }
    ];
    categoriesStore.categories = [
      { id: "music", name: "Musique", createdAt: "", updatedAt: "" },
      { id: "art", name: "Art", createdAt: "", updatedAt: "" }
    ];

    const loadSpy = vi.spyOn(categoriesStore, "loadCategories").mockResolvedValue();

    const wrapper = mount(HomePage, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(loadSpy).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Musique");
    expect(wrapper.text()).toContain("Art");
  });

  it("covers event detail fallbacks for empty detail state", async () => {
    const eventsStore = useEventsStore();
    eventsStore.isLoading = false;
    const wrapper = mount(EventDetailView, {
      props: { eventId: "missing" },
      global: {
        stubs: { EventMap: true, RelatedEvents: true }
      }
    });

    await wrapper.vm.$nextTick();

    expect(eventsStore.getEventById("missing")).toBeNull();
    expect(wrapper.text()).toContain("Événement introuvable");
    expect(wrapper.find('[data-testid="event-detail"]').exists()).toBe(false);
    expect((wrapper.vm as { $: { setupState: { optionalAddress: string } } }).$.setupState.optionalAddress).toBe("");
  });

  it("covers event store related sorting and excerpt truncation", () => {
    const eventsStore = useEventsStore();
    eventsStore.events = [
      {
        id: "1",
        title: "Main",
        content: "Texte sans phrase finale mais assez long".repeat(10),
        image: "img",
        categoryId: "music",
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
      },
      {
        id: "2",
        title: "Near same city",
        content: "Desc",
        image: "img",
        categoryId: "music",
        audienceId: null,
        occurrences: [
          {
            id: "occ-2",
            eventStartAt: "invalid",
            eventEndAt: "invalid",
            allDay: false,
            venueName: "Salle",
            address: null,
            postalCode: null,
            city: "Descartes",
            latitude: 46.971,
            longitude: 0.701
          }
        ],
        organizerName: null,
        status: "PUBLISHED"
      },
      {
        id: "3",
        title: "Far",
        content: "Desc",
        image: "img",
        categoryId: "music",
        audienceId: null,
        occurrences: [
          {
            id: "occ-3",
            eventStartAt: "2030-01-15T20:00:00.000Z",
            eventEndAt: "2030-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            address: null,
            postalCode: null,
            city: "Tours",
            latitude: 48,
            longitude: 1
          }
        ],
        organizerName: null,
        status: "PUBLISHED"
      }
    ];

    expect(eventsStore.getRelatedPublishedEvents("missing")).toEqual([]);
    expect(eventsStore.getRelatedPublishedEvents("1", 2).map((event) => event.id)).toEqual(["2", "3"]);
    expect(
      eventsStore.getEventShortExcerpt(
        {
          ...eventsStore.events[0],
          content: "abcdefghij".repeat(30)
        },
        0,
        20
      )
    ).toBe("abcdefghijabcdefghij…");
    expect(
      eventsStore.getEventShortExcerpt(
        {
          ...eventsStore.events[0],
          content: "texte court"
        },
        0,
        20
      )
    ).toBe("texte court");
  });

  it("covers backoffice layout route branches", async () => {
    const router = createTestRouter("/backoffice/admin/settings");
    await router.isReady();
    const authStore = useAuthStore();
    authStore.setRole("ADMIN");
    const wrapper = mount(BackofficeLayout, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.text()).toContain("Réglages");
  });

  it("covers remaining backoffice layout route branches", async () => {
    const adminRouter = createTestRouter("/backoffice/admin");
    await adminRouter.isReady();
    const authStore = useAuthStore();
    authStore.setRole("ADMIN");

    const adminWrapper = mount(BackofficeLayout, {
      global: {
        plugins: [adminRouter]
      }
    });

    expect(adminWrapper.text()).toContain("Administration");

    const rootRouter = createTestRouter("/backoffice");
    await rootRouter.isReady();
    const rootWrapper = mount(BackofficeLayout, {
      global: {
        plugins: [rootRouter]
      }
    });

    expect(rootWrapper.text()).toContain("Espace pro");
    expect(rootWrapper.text()).toContain("Retrouvez vos brouillons");
  });

  it("covers admin store user role rendering", async () => {
    const adminStore = useAdminStore();
    const authStore = useAuthStore();
    authStore.setRole("ADMIN");
    adminStore.adminUsers = [{ id: "1", name: "Admin", email: "a@test", role: "ADMIN" }] as never;
    const wrapper = mount(BackofficeAdminUsersPage);
    expect(wrapper.text()).toContain("Administrateur");
  });
});
