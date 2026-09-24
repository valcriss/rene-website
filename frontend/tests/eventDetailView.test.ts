import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import EventDetailView from "../src/components/events/EventDetailView.vue";
import { useCategoriesStore } from "../src/stores/categories";
import { useEventsStore } from "../src/stores/events";
import { createTestRouter } from "./testRouter";

describe("EventDetailView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("treats an archived event as not found when resolved from the store", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert archivé",
        content: "",
        image: "img",
        categoryId: "music",
        audienceId: null,
        occurrences: [
          {
            id: "occ-1",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            address: "",
            postalCode: "",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7
          }
        ],
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2099-01-15T22:00:00.000Z",
        archivedAt: "2026-02-01T00:00:00.000Z",
        rejectionReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const wrapper = mount(EventDetailView, {
      props: { eventId: "1" },
      global: {
        plugins: [pinia],
        stubs: { EventMap: { template: "<div></div>" } }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("Concert archivé");
    expect(wrapper.text()).toContain("Événement introuvable.");
  });

  it("keeps a naturally ended event indexable with an 'event ended' banner", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert terminé",
        content: "",
        image: "img",
        categoryId: "music",
        audienceId: null,
        occurrences: [
          {
            id: "occ-1",
            eventStartAt: "2020-01-15T20:00:00.000Z",
            eventEndAt: "2020-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            address: "",
            postalCode: "",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7
          }
        ],
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2020-01-15T22:00:00.000Z",
        rejectionReason: null,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z"
      }
    ];

    const wrapper = mount(EventDetailView, {
      props: { eventId: "1" },
      global: {
        plugins: [pinia],
        stubs: { EventMap: { template: "<div></div>" } }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Concert terminé");
    expect(wrapper.find("[data-testid='event-ended-banner']").exists()).toBe(true);
    expect(wrapper.text()).toContain("Cet événement est terminé");
  });

  it("renders fallback content and emits selection", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert",
        content: "",
        image: "img",
        categoryId: "music",
        audienceId: null,
        occurrences: [
          {
            id: "occ-1",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            address: "",
            postalCode: "",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7
          }
        ],
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2099-01-15T22:00:00.000Z",
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
    expect(wrapper.text()).toContain("Mis à jour le");
    expect(wrapper.find("[data-testid='related-events']").exists()).toBe(false);

    await wrapper.find("img").trigger("error");
    expect(eventsStore.imageErrorById["1"]).toBe(true);

    await wrapper.find("[data-testid='map-select']").trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
  });

  it("renders related events and emits selection from the helper", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const eventsStore = useEventsStore();
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [
      { id: "music", name: "Musique", createdAt: "", updatedAt: "" },
      { id: "festival", name: "Festival", createdAt: "", updatedAt: "" }
    ];
    eventsStore.isLoading = false;
    eventsStore.events = [
      {
        id: "1",
        title: "Concert",
        content: "<p>Texte</p>",
        image: "img",
        categoryId: "music",
        audienceId: null,
        occurrences: [
          {
            id: "occ-1",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            address: "",
            postalCode: "",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7
          }
        ],
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2099-01-15T22:00:00.000Z",
        rejectionReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "2",
        title: "Festival voisin",
        content: "Autre événement",
        image: "img-2",
        categoryId: "festival",
        audienceId: null,
        occurrences: [
          {
            id: "occ-2",
            eventStartAt: "2026-01-16T20:00:00.000Z",
            eventEndAt: "2026-01-16T22:00:00.000Z",
            allDay: false,
            venueName: "Place",
            address: "",
            postalCode: "",
            city: "Descartes",
            latitude: 46.971,
            longitude: 0.701
          }
        ],
        organizerName: "Org",
        status: "PUBLISHED",
        publishedAt: null,
        publicationEndAt: "2099-01-16T22:00:00.000Z",
        rejectionReason: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const router = createTestRouter("/event/1");
    await router.isReady();
    const wrapper = mount(EventDetailView, {
      props: { eventId: "1" },
      global: {
        plugins: [pinia, router],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.html()).toContain("Texte");
    expect(wrapper.text().match(/Texte/g)?.length ?? 0).toBe(1);
    expect(wrapper.find("[data-testid='related-events']").exists()).toBe(true);

    const relatedCard = wrapper.find("[data-testid='related-event-card-2']");
    expect(relatedCard.attributes("href")).toBe("/event/2");

    await relatedCard.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["2"]);

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { emitSelect: (id: string) => void } };
    }).$.setupState;
    setupState.emitSelect("1");
    expect(wrapper.emitted("select")?.[1]).toEqual(["1"]);
  });

  it("renders sanitized pricing info when available", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];

    const wrapper = mount(EventDetailView, {
      props: {
        eventId: "1",
        event: {
          id: "1",
          title: "Concert",
          content: "<p>Texte</p>",
          image: "img",
          categoryId: "music",
          audienceId: null,
          occurrences: [
            {
              id: "occ-1",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "Salle",
              address: "",
              postalCode: "",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7
            }
          ],
          organizerName: "Org",
          socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }],
          ticketUrl: "https://tickets.example.com",
          pricingInfo:
            '<ul><li><strong>Plein tarif</strong> : 12 €</li></ul><a href="javascript:alert(1)" onclick="alert(2)">lien</a><svg><g onload="alert(3)"></g></svg><script>alert(4)</script>',
          status: "PUBLISHED",
          publishedAt: null,
          publicationEndAt: "2026-01-15T22:00:00.000Z",
          rejectionReason: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      },
      global: {
        plugins: [pinia],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.html()).toContain("Horaires et tarifs");
    const sanitizedPricing = wrapper.find("[data-testid='sanitized-pricing-info']").html();
    expect(sanitizedPricing).toContain("<strong>Plein tarif</strong>");
    expect(sanitizedPricing).not.toContain("<script>");
    expect(sanitizedPricing).not.toContain("javascript:");
    expect(sanitizedPricing).not.toContain("onclick");
    expect(sanitizedPricing).not.toContain("onload");
    expect(sanitizedPricing).not.toContain("<svg");
    expect(wrapper.find("[data-testid='detail-social-links']").exists()).toBe(true);
    expect(wrapper.find("a[title='Facebook']").attributes("href")).toBe("https://facebook.com/rene");
    const ticketingLink = wrapper.find("a[href='https://tickets.example.com']");
    expect(ticketingLink.exists()).toBe(true);
    expect(ticketingLink.attributes("target")).toBe("_blank");
    expect(ticketingLink.attributes("rel")).toBe("noopener noreferrer");
    expect(ticketingLink.text()).toBe("Voir la billetterie");
  });

  it("renders organizer, ticketing and website links as clickable labels, normalizing missing protocols", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];

    const wrapper = mount(EventDetailView, {
      props: {
        eventId: "1",
        event: {
          id: "1",
          title: "Concert",
          content: "<p>Texte</p>",
          image: "img",
          categoryId: "music",
          audienceId: null,
          occurrences: [
            {
              id: "occ-1",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "Salle",
              address: "",
              postalCode: "",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7
            }
          ],
          organizerName: "Org",
          organizerUrl: "exemple-organisateur.fr",
          websiteUrl: "www.exemple-site.fr",
          status: "PUBLISHED",
          publishedAt: null,
          publicationEndAt: "2026-01-15T22:00:00.000Z",
          rejectionReason: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      },
      global: {
        plugins: [pinia],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    await wrapper.vm.$nextTick();

    const organizerLink = wrapper.find("a[href='https://exemple-organisateur.fr']");
    expect(organizerLink.exists()).toBe(true);
    expect(organizerLink.text()).toBe("Visiter le site");
    expect(organizerLink.attributes("target")).toBe("_blank");

    const websiteLink = wrapper.find("a[href='https://www.exemple-site.fr']");
    expect(websiteLink.exists()).toBe(true);
    expect(websiteLink.text()).toBe("Visiter le site");

    expect(wrapper.find("a[href='https://tickets.example.com']").exists()).toBe(false);
    expect(wrapper.text()).toContain("Non renseigné");
  });

  it("renders citywide events without an empty venue separator", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];

    const wrapper = mount(EventDetailView, {
      props: {
        eventId: "1",
        event: {
          id: "1",
          title: "Parcours en ville",
          content: "<p>Texte</p>",
          image: "img",
          categoryId: "music",
          audienceId: null,
          occurrences: [
            {
              id: "occ-1",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "",
              address: "",
              postalCode: "37160",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7
            }
          ],
          organizerName: "Org",
          status: "PUBLISHED",
          publishedAt: null,
          publicationEndAt: "2026-01-15T22:00:00.000Z",
          rejectionReason: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      },
      global: {
        plugins: [pinia],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Descartes");
    expect(wrapper.text()).not.toContain("· Descartes");
    expect(wrapper.find("a[href*='destination=37160%2C%20Descartes']").exists()).toBe(true);
  });

  it("lists several occurrences with their own calendar and directions actions", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const categoriesStore = useCategoriesStore();
    categoriesStore.categories = [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }];

    const wrapper = mount(EventDetailView, {
      props: {
        eventId: "1",
        event: {
          id: "1",
          title: "Tournée",
          content: "<p>Texte</p>",
          image: "img",
          categoryId: "music",
          audienceId: null,
          occurrences: [
            {
              id: "occ-1",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "Salle",
              address: "",
              postalCode: "",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7
            },
            {
              id: "occ-2",
              eventStartAt: "2026-02-01T20:00:00.000Z",
              eventEndAt: "2026-02-01T22:00:00.000Z",
              allDay: false,
              venueName: "Autre salle",
              address: "",
              postalCode: "",
              city: "Tours",
              latitude: 47,
              longitude: 0.69
            }
          ],
          organizerName: "Org",
          status: "PUBLISHED",
          publishedAt: null,
          publicationEndAt: "2026-02-01T22:00:00.000Z",
          rejectionReason: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      },
      global: {
        plugins: [pinia],
        stubs: {
          EventMap: { template: "<div></div>" }
        }
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find("[data-testid='detail-occurrence-occ-1']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='detail-occurrence-occ-2']").exists()).toBe(true);
    expect(wrapper.findAll("a[download]")).toHaveLength(2);
    expect(wrapper.find("a[download='evenement-occ-1.ics']").exists()).toBe(true);
    expect(wrapper.find("a[download='evenement-occ-2.ics']").exists()).toBe(true);
  });
});
