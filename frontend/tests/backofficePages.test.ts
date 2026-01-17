import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/vue";
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
  organizerName: "Org",
  status: "PUBLISHED",
  publishedAt: null,
  publicationEndAt: "2030-01-15T22:00:00.000Z",
  rejectionReason: null,
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

    await fireEvent.click(screen.getByText("Se connecter"));
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

  it("submits drafts and deletes published events", async () => {
    const { router, pinia } = await setup("/backoffice/events", "EDITOR");
    const eventsStore = useEventsStore(pinia);
    const editorStore = useEditorStore(pinia);
    const submitSpy = vi.spyOn(editorStore, "handleSubmitDraft").mockResolvedValue(true);
    const deleteSpy = vi.spyOn(eventsStore, "handleDelete").mockResolvedValue();
    eventsStore.events = [
      buildEvent({ id: "1", status: "DRAFT" }),
      buildEvent({ id: "2", status: "PUBLISHED" })
    ];

    render(BackofficeEventsPage, {
      global: {
        plugins: [pinia, router]
      }
    });

    await fireEvent.click(screen.getByText("Soumettre"));
    await fireEvent.click(screen.getByText("Supprimer"));

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
    vi.spyOn(editorStore, "handleSaveDraft").mockResolvedValue(true);

    render(BackofficeEventCreatePage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    await fireEvent.click(screen.getByText("Mettre à jour"));
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events");
  });

  it("redirects after submit in edit mode", async () => {
    const { router, pinia } = await setup("/backoffice/events/new", "EDITOR");
    const pushSpy = vi.spyOn(router, "push");
    const editorStore = useEditorStore(pinia);
    const categoriesStore = useCategoriesStore(pinia);
    categoriesStore.hasLoaded = true;
    editorStore.editorMode = "edit";
    vi.spyOn(editorStore, "handleSubmitDraft").mockResolvedValue(true);

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
