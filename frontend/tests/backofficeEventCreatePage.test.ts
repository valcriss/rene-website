import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { describe, expect, it, vi, afterEach } from "vitest";
import { useEditorStore } from "../src/stores/editor";
import { useAuthStore } from "../src/stores/auth";
import { useCategoriesStore } from "../src/stores/categories";
import { createTestRouter } from "./testRouter";
import BackofficeEventCreatePage from "../src/pages/backoffice/BackofficeEventCreatePage.vue";

const setupPage = async () => {
  const router = createTestRouter("/backoffice/events/new");
  await router.isReady();
  const pinia = createPinia();
  const authStore = useAuthStore(pinia);
  authStore.setRole("EDITOR");
  const editorStore = useEditorStore(pinia);
  const categoriesStore = useCategoriesStore(pinia);
  return { router, pinia, editorStore, categoriesStore };
};

const renderPage = ({ router, pinia }: { router: ReturnType<typeof createTestRouter>; pinia: ReturnType<typeof createPinia> }) => {
  render(BackofficeEventCreatePage, {
    global: {
      plugins: [pinia, router]
    }
  });
};

describe("BackofficeEventCreatePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads categories and binds selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: "music", name: "Musique" }])
        })
      )
    );

    const setup = await setupPage();
    renderPage(setup);

    const select = await screen.findByLabelText("Catégorie");
    await fireEvent.update(select, "music");

    expect((select as HTMLSelectElement).value).toBe("music");
    expect(screen.getAllByText("Musique").length).toBeGreaterThan(0);
  });

  it("shows empty state when no categories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.categories = [];
    setup.categoriesStore.loading = false;
    setup.categoriesStore.hasLoaded = true;
    renderPage(setup);

    expect(await screen.findByText("Aucune catégorie disponible.")).toBeInTheDocument();
  });

  it("uploads image selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    const spy = vi.spyOn(setup.editorStore, "setImageFile");
    renderPage(setup);
    const input = document.querySelector("section label input[type='file']") as HTMLInputElement | null;
    if (!input) {
      throw new Error("Main image input not found");
    }
    const file = new File(["image"], "photo.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await fireEvent.update(input, "photo.png");

    expect(spy).toHaveBeenCalled();
  });

  it("handles empty image selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    const spy = vi.spyOn(setup.editorStore, "setImageFile");
    renderPage(setup);
    const input = document.querySelector("section label input[type='file']") as HTMLInputElement | null;
    if (!input) {
      throw new Error("Main image input not found");
    }

    Object.defineProperty(input, "files", { value: [], configurable: true });
    await fireEvent.update(input, "");

    expect(spy).toHaveBeenCalledWith(null);
  });

  it("invokes editor actions directly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    setup.editorStore.editorMode = "edit";
    const saveSpy = vi.spyOn(setup.editorStore, "saveDraftAndReturn").mockResolvedValue({
      id: "draft-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      audienceId: "all",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      allDay: true,
      venueName: "Salle",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      geolocationPrecision: "EXACT",
      organizerName: "Association",
      status: "DRAFT"
    });
    const submitSpy = vi.spyOn(setup.editorStore, "handleSaveAndSubmit").mockResolvedValue(true);
    const previewSpy = vi.spyOn(setup.editorStore, "savePreviewSnapshot").mockReturnValue("preview-1");
    const pushSpy = vi.spyOn(setup.router, "push");

    const wrapper = mount(BackofficeEventCreatePage, {
      global: {
        plugins: [setup.pinia, setup.router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    const setupState = (wrapper.vm as unknown as {
      $: {
        setupState: {
          handleSaveAndRedirect: () => Promise<void>;
          handleSubmitAndRedirect: () => Promise<void>;
          handlePreview: () => void;
          handleImageChange: (event: Event) => void;
          goToEvents: () => void;
        };
      };
    }).$.setupState;

    await setupState.handleSaveAndRedirect();
    await setupState.handleSubmitAndRedirect();
    setupState.handlePreview();
    setupState.handleImageChange({ target: { files: [] } } as unknown as Event);
    setupState.goToEvents();

    expect(saveSpy).toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
    expect(previewSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith({
      name: "backoffice-events-preview",
      query: { preview: "preview-1" }
    });
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events");
  });

  it("redirects after saving from create mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    const saveSpy = vi.spyOn(setup.editorStore, "saveDraftAndReturn").mockResolvedValue({
      id: "draft-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      audienceId: "all",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      allDay: true,
      venueName: "Salle",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      geolocationPrecision: "EXACT",
      organizerName: "Association",
      status: "DRAFT"
    });
    const pushSpy = vi.spyOn(setup.router, "push");

    const wrapper = mount(BackofficeEventCreatePage, {
      global: {
        plugins: [setup.pinia, setup.router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    const setupState = (wrapper.vm as unknown as {
      $: {
        setupState: {
          handleSaveAndRedirect: () => Promise<void>;
        };
      };
    }).$.setupState;

    await setupState.handleSaveAndRedirect();

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(pushSpy).toHaveBeenCalledWith({ path: "/backoffice/events", query: {} });
  });

  it("redirects with an unresolved location warning after draft save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    vi.spyOn(setup.editorStore, "saveDraftAndReturn").mockResolvedValue({
      id: "draft-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      audienceId: "all",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      allDay: true,
      venueName: "Salle",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes",
      latitude: null,
      longitude: null,
      geolocationPrecision: "UNRESOLVED",
      organizerName: "Association",
      status: "DRAFT"
    });
    const pushSpy = vi.spyOn(setup.router, "push");

    const wrapper = mount(BackofficeEventCreatePage, {
      global: {
        plugins: [setup.pinia, setup.router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    const setupState = (wrapper.vm as unknown as {
      $: {
        setupState: {
          handleSaveAndRedirect: () => Promise<void>;
        };
      };
    }).$.setupState;

    await setupState.handleSaveAndRedirect();

    expect(pushSpy).toHaveBeenCalledWith({
      path: "/backoffice/events",
      query: { location: "unresolved", saved: "draft" }
    });
  });

  it("redirects with an approximate location warning after draft save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    vi.spyOn(setup.editorStore, "saveDraftAndReturn").mockResolvedValue({
      id: "draft-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      audienceId: "all",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      allDay: false,
      venueName: "Salle",
      address: "1 rue du centre",
      postalCode: "37160",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      geolocationPrecision: "APPROXIMATE",
      organizerName: "Association",
      status: "DRAFT"
    });
    const pushSpy = vi.spyOn(setup.router, "push");

    const wrapper = mount(BackofficeEventCreatePage, {
      global: {
        plugins: [setup.pinia, setup.router],
        stubs: {
          RichTextEditor: { template: "<div></div>" }
        }
      }
    });

    const setupState = (wrapper.vm as unknown as {
      $: {
        setupState: {
          handleSaveAndRedirect: () => Promise<void>;
        };
      };
    }).$.setupState;

    await setupState.handleSaveAndRedirect();

    expect(pushSpy).toHaveBeenCalledWith({
      path: "/backoffice/events",
      query: { location: "approximate", saved: "draft" }
    });
  });

  it("disables save and submit buttons while a persistence action is running", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    setup.editorStore.isSubmittingForModeration = true;
    renderPage(setup);

    expect(await screen.findByRole("button", { name: "Enregistrer le brouillon" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Soumettre à modération" })).toBeDisabled();
  });

  it("disables save and submit buttons while the title is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    renderPage(setup);

    expect(await screen.findByRole("button", { name: "Enregistrer le brouillon" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Soumettre à modération" })).toBeDisabled();
  });

  it("enables save and submit buttons once a title is entered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    renderPage(setup);

    const titleInput = await screen.findByLabelText("Titre");
    await fireEvent.update(titleInput, "Brouillon sans détails");

    expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Soumettre à modération" })).not.toBeDisabled();
  });

  it("shows submit button from create mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    renderPage(setup);

    expect(await screen.findByRole("button", { name: "Soumettre à modération" })).toBeInTheDocument();
  });

  it("adapts actions when editing a published event revision", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    setup.editorStore.editorMode = "edit";
    setup.editorStore.editingPublishedEvent = true;
    setup.editorStore.editingPublishedRevisionStatus = "DRAFT";
    renderPage(setup);

    expect(await screen.findByText(/Une révision brouillon existe déjà/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soumettre à modération" })).toBeInTheDocument();
  });

  it("resets editor form in edit mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    setup.editorStore.editorMode = "edit";
    const resetSpy = vi.spyOn(setup.editorStore, "resetEditorForm");
    renderPage(setup);

    await fireEvent.click(await screen.findByText("Nouveau brouillon"));
    expect(resetSpy).toHaveBeenCalled();
  });

  it("updates content from rich text editor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;

    const RichTextEditorStub = {
      template:
        "<button data-testid='editor-update' @click=\"$emit('update:modelValue','<p>Nouveau</p>')\"></button>"
    };

    const wrapper = mount(BackofficeEventCreatePage, {
      global: {
        plugins: [setup.pinia, setup.router],
        stubs: {
          RichTextEditor: RichTextEditorStub
        }
      }
    });

    await wrapper.find("[data-testid='editor-update']").trigger("click");
    expect(setup.editorStore.editorForm.content).toBe("<p>Nouveau</p>");
  });

  it("updates pricing info from dedicated rich text editor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;

    const RichTextEditorStub = {
      props: ["modelValue", "ariaLabel"],
      template:
        "<button data-testid='pricing-editor-update' @click=\"$emit('update:modelValue','<p>Plein tarif : 12 €</p>')\">{{ ariaLabel }}</button>"
    };

    const wrapper = mount(BackofficeEventCreatePage, {
      global: {
        plugins: [setup.pinia, setup.router],
        stubs: {
          RichTextEditor: RichTextEditorStub
        }
      }
    });

    const buttons = wrapper.findAll("[data-testid='pricing-editor-update']");
    await buttons[1].trigger("click");
    expect(setup.editorStore.editorForm.pricingInfo).toBe("<p>Plein tarif : 12 €</p>");
  });

  it("adds and removes social links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
    );

    const setup = await setupPage();
    setup.categoriesStore.hasLoaded = true;
    renderPage(setup);

    await fireEvent.click(await screen.findByRole("button", { name: "Ajouter un réseau social" }));

    expect(setup.editorStore.editorForm.socialLinks).toHaveLength(1);
    expect(await screen.findByTestId("social-link-row-0")).toBeInTheDocument();

    await fireEvent.update(screen.getByLabelText("URL"), "https://facebook.com/rene");

    expect(setup.editorStore.editorForm.socialLinks[0]?.url).toBe("https://facebook.com/rene");

    await fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(setup.editorStore.editorForm.socialLinks).toHaveLength(0);
  });
});
