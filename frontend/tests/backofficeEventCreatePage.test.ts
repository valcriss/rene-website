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
    expect(screen.getByText("Musique")).toBeInTheDocument();
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
    const input = await screen.findByLabelText("Image");
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
    const input = await screen.findByLabelText("Image");

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
    const saveSpy = vi.spyOn(setup.editorStore, "handleSaveDraft").mockResolvedValue(true);
    const submitSpy = vi.spyOn(setup.editorStore, "handleSubmitDraft").mockResolvedValue(true);
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
          handleImageChange: (event: Event) => void;
          goToEvents: () => void;
        };
      };
    }).$.setupState;

    await setupState.handleSaveAndRedirect();
    await setupState.handleSubmitAndRedirect();
    setupState.handleImageChange({ target: { files: [] } } as unknown as Event);
    setupState.goToEvents();

    expect(saveSpy).toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith("/backoffice/events");
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
});
