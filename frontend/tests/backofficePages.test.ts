import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/vue";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestRouter } from "./testRouter";
import { useAuthStore } from "../src/stores/auth";
import { useEditorStore } from "../src/stores/editor";
import { useEventsStore } from "../src/stores/events";
import { useCategoriesStore } from "../src/stores/categories";
import { useAdminStore } from "../src/stores/admin";
import BackofficeLayout from "../src/pages/backoffice/BackofficeLayout.vue";
import BackofficeEventsPage from "../src/pages/backoffice/BackofficeEventsPage.vue";
import BackofficeEventCreatePage from "../src/pages/backoffice/BackofficeEventCreatePage.vue";
import BackofficeModerationPage from "../src/pages/backoffice/BackofficeModerationPage.vue";
import BackofficeModerationViewPage from "../src/pages/backoffice/BackofficeModerationViewPage.vue";
import BackofficeAdminUsersPage from "../src/pages/backoffice/BackofficeAdminUsersPage.vue";
import BackofficeAdminCategoriesPage from "../src/pages/backoffice/BackofficeAdminCategoriesPage.vue";
import BackofficeAdminSettingsPage from "../src/pages/backoffice/BackofficeAdminSettingsPage.vue";
import type { EventItem } from "../src/api/events";

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "1",
  title: "Concert",
  content: "Hello",
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
  geolocationPrecision: "EXACT",
  organizerName: "Org",
  status: "PUBLISHED",
  publishedAt: null,
  publicationEndAt: "2030-01-15T22:00:00.000Z",
  rejectionReason: null,
  createdByUserId: "current-user",
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
  ...overrides
});

const setup = async (path: string, role: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => {
  const router = createTestRouter(path);
  await router.isReady();
  const pinia = createPinia();
  const authStore = useAuthStore(pinia);
  authStore.setRole(role);
  authStore.userId = role === "VISITOR" ? null : "current-user";
  return { router, pinia, authStore };
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("BackofficeLayout", () => {
  it("navigates to home and login", async () => {
    const { router, pinia } = await setup("/backoffice", "VISITOR");
    const pushSpy = vi.spyOn(router, "push");

    render(BackofficeLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    await fireEvent.click(screen.getByText("Retour au site"));
    expect(pushSpy).toHaveBeenCalledWith("/");

    await fireEvent.click(screen.getAllByText("Me connecter")[0]);
    expect(pushSpy).toHaveBeenCalledWith("/login");
  });

  it("moves logout to the shared header account menu", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");

    render(BackofficeLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();

    await fireEvent.click(screen.getAllByRole("button", { name: "Compte" })[0]);
    await fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(pushSpy).toHaveBeenCalledWith("/login");
  });
});

describe("BackofficeEventsPage", () => {
  it("shows access denied when visitor", async () => {
    const { router, pinia } = await setup("/backoffice/events", "VISITOR");
    render(BackofficeEventsPage, { global: { plugins: [pinia, router] } });

    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
  });

  it("routes to create and displays delete errors", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [buildEvent()];
    eventsStore.deleteError = "Erreur suppression";

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(screen.getByText("Erreur suppression")).toBeInTheDocument();
    await fireEvent.click(screen.getByText("Ajouter un événement"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events/new");
  });

  it("shows editorial sections for editors only on owned articles", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [
      buildEvent({ id: "1", status: "DRAFT", title: "Mon brouillon" }),
      buildEvent({
        id: "2",
        status: "REJECTED",
        title: "Ma reprise",
        rejectionReason: "Corriger la mise en page"
      }),
      buildEvent({ id: "3", status: "PUBLISHED", title: "Mon article publié" }),
      buildEvent({
        id: "4",
        status: "DRAFT",
        title: "Brouillon externe",
        createdByUserId: "other-user"
      })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(screen.getAllByText("Mes brouillons").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reprises éditoriales").length).toBeGreaterThan(0);
    expect(screen.getByText("Événements publiés")).toBeInTheDocument();
    expect(screen.queryByText("Les autres articles")).not.toBeInTheDocument();
    expect(screen.getByText("Mon brouillon")).toBeInTheDocument();
    expect(screen.getByText("Ma reprise")).toBeInTheDocument();
    expect(screen.getByText("Mon article publié")).toBeInTheDocument();
    expect(screen.getAllByText(/Mis à jour le/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Brouillon externe")).not.toBeInTheDocument();
  });

  it("shows published revision notices and hides edit action while revision is pending", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [
      buildEvent({
        id: "3",
        status: "PUBLISHED",
        title: "Mon article publié",
        pendingRevision: {
          id: "revision-1",
          eventId: "3",
          title: "Mon article publié v2",
          content: "Hello",
          image: "img-2",
          createdByUserId: "current-user",
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
          status: "PENDING",
          rejectionReason: null,
          createdAt: "2030-01-02T00:00:00.000Z",
          updatedAt: "2030-01-02T00:00:00.000Z"
        }
      })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(screen.getByText("Mon article publié")).toBeInTheDocument();
    expect(screen.getByText(/Une nouvelle version est actuellement en attente de validation/i)).toBeInTheDocument();
    expect(screen.getByText(/Modification indisponible tant que cet événement est en cours de modération/i)).toBeInTheDocument();
    expect(screen.queryByText("Modifier")).not.toBeInTheDocument();
    expect(screen.queryByText("Reprendre mon brouillon")).not.toBeInTheDocument();
  });

  it("shows published draft revision notices", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [
      buildEvent({
        id: "3",
        status: "PUBLISHED",
        title: "Mon article publié",
        pendingRevision: {
          id: "revision-1",
          eventId: "3",
          title: "Mon article publié v2",
          content: "Hello",
          image: "img-2",
          createdByUserId: "current-user",
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
          status: "DRAFT",
          rejectionReason: null,
          createdAt: "2030-01-02T00:00:00.000Z",
          updatedAt: "2030-01-02T00:00:00.000Z"
        }
      })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    const publishedCard = screen.getByText("Mon article publié").closest("li");

    expect(screen.getByText(/Une nouvelle version est enregistrée en brouillon/i)).toBeInTheDocument();
    expect(publishedCard).not.toBeNull();
    expect(within(publishedCard as HTMLElement).queryByText("Supprimer")).not.toBeInTheDocument();
  });

  it("shows other articles for moderators and excludes owned items from that block", async () => {
    const { router, pinia } = await setup("/backoffice/events", "MODERATOR");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [
      buildEvent({ id: "1", status: "DRAFT", title: "Mon brouillon" }),
      buildEvent({
        id: "2",
        status: "PENDING",
        title: "Validation externe",
        createdByUserId: "other-user"
      }),
      buildEvent({
        id: "3",
        status: "PUBLISHED",
        title: "Publication externe",
        createdByUserId: "other-user"
      })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(screen.getAllByText("Les autres articles").length).toBeGreaterThan(0);
    expect(screen.getByText("Validation externe")).toBeInTheDocument();
    expect(screen.getByText("Publication externe")).toBeInTheDocument();
    expect(screen.getByText(/Modification indisponible tant que cet événement est en cours de modération/i)).toBeInTheDocument();
    expect(screen.getAllByText("Mon brouillon")).toHaveLength(1);
  });

  it("starts edit flow for draft events", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    const startEditSpy = vi.spyOn(editorStore, "startEdit");
    eventsStore.events = [buildEvent({ status: "DRAFT" })];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    await fireEvent.click(screen.getByText("Modifier"));
    expect(startEditSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events/new");
  });

  it("submits drafts and deletes only draft events for editors", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    const submitSpy = vi.spyOn(editorStore, "handleSubmitDraft").mockResolvedValue(true);
    const deleteSpy = vi.spyOn(eventsStore, "handleDelete").mockResolvedValue();
    eventsStore.events = [
      buildEvent({ id: "1", status: "DRAFT", title: "Mon brouillon" }),
      buildEvent({ id: "2", status: "PUBLISHED", title: "Mon article publié" })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    const draftCard = screen.getByText("Mon brouillon").closest("li");
    const publishedCard = screen.getByText("Mon article publié").closest("li");

    expect(draftCard).not.toBeNull();
    expect(publishedCard).not.toBeNull();

    await fireEvent.click(within(draftCard as HTMLElement).getByText("Soumettre"));
    await fireEvent.click(within(draftCard as HTMLElement).getByText("Supprimer"));

    expect(within(publishedCard as HTMLElement).queryByText("Supprimer")).not.toBeInTheDocument();

    expect(submitSpy).toHaveBeenCalledWith("1");
    expect(deleteSpy).toHaveBeenCalledWith("1");
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it("shows an unresolved-location banner and disables draft submission when coordinates are missing", async () => {
    const { router, pinia } = await setup("/backoffice/events?location=unresolved&saved=draft", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    const submitSpy = vi.spyOn(editorStore, "handleSubmitDraft").mockResolvedValue(true);
    eventsStore.events = [
      buildEvent({ id: "1", status: "DRAFT", latitude: null, longitude: null })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(
      screen.getByText(/Le brouillon a été enregistré, mais la localisation n'a pas pu être retrouvée/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cette fiche ne peut pas être soumise tant que la localisation n'a pas été correctement retrouvée/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soumettre" })).toBeDisabled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("shows approximate-location messaging and keeps submission enabled", async () => {
    const { router, pinia } = await setup("/backoffice/events?location=approximate&saved=draft", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    const submitSpy = vi.spyOn(editorStore, "handleSubmitDraft").mockResolvedValue(true);
    eventsStore.events = [
      buildEvent({ id: "1", status: "DRAFT", geolocationPrecision: "APPROXIMATE" })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(
      screen.getByText(/Le brouillon a été enregistré avec une localisation approximative/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Le lieu précis n'a pas été géolocalisé/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soumettre" })).not.toBeDisabled();

    await fireEvent.click(screen.getByRole("button", { name: "Soumettre" }));

    expect(submitSpy).toHaveBeenCalledWith("1");
  });

  it("displays editor submission errors", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    eventsStore.events = [buildEvent({ id: "1", status: "DRAFT" })];
    editorStore.editorError = "La localisation doit être corrigée avant la soumission à modération.";

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(screen.getByText(/La localisation doit être corrigée avant la soumission à modération/i)).toBeInTheDocument();
  });

  it("keeps edit, submit and delete actions in the other articles section", async () => {
    const { router, pinia } = await setup("/backoffice/events", "ADMIN");
    const pushSpy = vi.spyOn(router, "push");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    const startEditSpy = vi.spyOn(editorStore, "startEdit");
    const submitSpy = vi.spyOn(editorStore, "handleSubmitDraft").mockResolvedValue(true);
    const deleteSpy = vi.spyOn(eventsStore, "handleDelete").mockResolvedValue();
    eventsStore.events = [
      buildEvent({
        id: "1",
        status: "REJECTED",
        title: "Reprise externe",
        createdByUserId: "other-user",
        rejectionReason: "Compléter le texte"
      }),
      buildEvent({
        id: "2",
        status: "PUBLISHED",
        title: "Publié externe",
        createdByUserId: "other-user"
      })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    const editButtons = screen.getAllByText("Modifier");
    const submitButtons = screen.getAllByText("Soumettre");
    const deleteButtons = screen.getAllByText("Supprimer");

    await fireEvent.click(editButtons[0]);
    await fireEvent.click(submitButtons[0]);
    await fireEvent.click(deleteButtons[0]);

    expect(startEditSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events/new");
    expect(submitSpy).toHaveBeenCalledWith("1");
    expect(deleteSpy).toHaveBeenCalledWith("2");
  });
});

describe("BackofficeEventCreatePage", () => {
  it("shows access denied when visitor", async () => {
    const { router, pinia } = await setup("/backoffice/events/new", "VISITOR");
    const categoriesStore = useCategoriesStore(pinia);
    categoriesStore.hasLoaded = true;

    render(BackofficeEventCreatePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
  });

  it("routes back to events list", async () => {
    const { router, pinia } = await setup("/backoffice/events/new", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");
    const categoriesStore = useCategoriesStore(pinia);
    categoriesStore.hasLoaded = true;

    render(BackofficeEventCreatePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    await fireEvent.click(screen.getByText("Retour à mes événements"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events");
  });

  it("redirects after saving in edit mode", async () => {
    const { router, pinia } = await setup("/backoffice/events/new", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");
    const editorStore = useEditorStore(pinia);
    const categoriesStore = useCategoriesStore(pinia);
    categoriesStore.hasLoaded = true;
    editorStore.editorMode = "edit";
    vi.spyOn(editorStore, "saveDraftAndReturn").mockResolvedValue(buildEvent({ status: "DRAFT" }));

    render(BackofficeEventCreatePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    await fireEvent.click(screen.getByText("Mettre à jour"));
    expect(pushSpy).toHaveBeenCalledWith({ path: "/backoffice/events", query: {} });
  });

  it("redirects after submit in edit mode", async () => {
    const { router, pinia } = await setup("/backoffice/events/new", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");
    const editorStore = useEditorStore(pinia);
    const categoriesStore = useCategoriesStore(pinia);
    categoriesStore.hasLoaded = true;
    editorStore.editorMode = "edit";
    vi.spyOn(editorStore, "handleSaveAndSubmit").mockResolvedValue(true);

    render(BackofficeEventCreatePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    await fireEvent.click(screen.getByText("Soumettre à modération"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events");
  });
});

describe("BackofficeModerationPage", () => {
  it("shows access denied when not moderator", async () => {
    const { router, pinia } = await setup("/backoffice/moderation", "EDITOR");
    render(BackofficeModerationPage, { global: { plugins: [pinia, router] } });

    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
  });

  it("routes to moderation view", async () => {
    const { router, pinia } = await setup("/backoffice/moderation", "MODERATOR");
    const pushSpy = vi.spyOn(router, "push");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [buildEvent({ status: "PENDING" })];

    render(BackofficeModerationPage, { global: { plugins: [pinia, router] } });

    await fireEvent.click(screen.getByText("Voir la publication"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/moderation/view/1");
  });

  it("uses a multiline rejection reason field", async () => {
    const { router, pinia } = await setup("/backoffice/moderation", "MODERATOR");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [buildEvent({ status: "PENDING" })];

    render(BackofficeModerationPage, { global: { plugins: [pinia, router] } });

    const field = screen.getByPlaceholderText("Motif de refus");
    expect(field.tagName).toBe("TEXTAREA");

    await fireEvent.update(field, "Première ligne\nDeuxième ligne");
    expect(eventsStore.rejectionReasons["1"]).toBe("Première ligne\nDeuxième ligne");
  });

  it("allows moderators to mark an event as featured before publishing", async () => {
    const { router, pinia } = await setup("/backoffice/moderation", "MODERATOR");
    const eventsStore = useEventsStore(pinia);
    eventsStore.events = [buildEvent({ status: "PENDING", featured: false })];

    render(BackofficeModerationPage, { global: { plugins: [pinia, router] } });

    const checkbox = screen.getByLabelText(/Cet événement peut être mis en avant/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await fireEvent.click(checkbox);

    expect(eventsStore.featuredEventIds["1"]).toBe(true);
  });
});

describe("BackofficeModerationViewPage", () => {
  it("returns to moderation and follows selected event", async () => {
    const { router, pinia } = await setup("/backoffice/moderation/view/1", "MODERATOR");
    const pushSpy = vi.spyOn(router, "push");

    render(BackofficeModerationViewPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          EventDetailView: {
            props: ["eventId"],
            emits: ["select"],
            template:
              "<div><button type='button' @click=\"$emit('select','42')\">Select</button><slot name='header'></slot></div>"
          }
        }
      }
    });

    expect(screen.getByText("Prévisualisation de la publication")).toBeInTheDocument();

    await fireEvent.click(screen.getByText("Retour à la modération"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/moderation");

    await fireEvent.click(screen.getByText("Select"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/moderation/view/42");
  });
});

describe("Backoffice admin pages", () => {
  it.each([
    BackofficeAdminUsersPage,
    BackofficeAdminCategoriesPage,
    BackofficeAdminSettingsPage
  ])("shows access denied for %p", async (Component) => {
    const { pinia } = await setup("/backoffice/admin/users", "VISITOR");
    render(Component, { global: { plugins: [pinia] } });

    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
  });

  it("shows loading state for admin categories", async () => {
    const { pinia } = await setup("/backoffice/admin/categories", "ADMIN");
    const adminStore = useAdminStore(pinia);
    adminStore.adminLoading = true;

    render(BackofficeAdminCategoriesPage, { global: { plugins: [pinia] } });

    expect(screen.getByText(/Chargement de l'administration/i)).toBeInTheDocument();
  });

  it("shows loading state for admin settings", async () => {
    const { pinia } = await setup("/backoffice/admin/settings", "ADMIN");
    const adminStore = useAdminStore(pinia);
    adminStore.adminLoading = true;

    render(BackofficeAdminSettingsPage, { global: { plugins: [pinia] } });

    expect(screen.getByText(/Chargement de l'administration/i)).toBeInTheDocument();
  });
});
