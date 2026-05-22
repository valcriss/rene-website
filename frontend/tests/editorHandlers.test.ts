import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { vi } from "vitest";
import App from "../src/App.vue";
import { CreateEventPayload } from "../src/api/events";
import { useEditorStore } from "../src/stores/editor";
import { createTestRouter } from "./testRouter";

type FetchInput = string | { url: string };

vi.mock("../src/components/EventMap.vue", () => ({
  default: {
    name: "EventMap",
    props: ["events", "selectedId"],
    template: "<div></div>"
  }
}));

const submitMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../src/api/events", async () => {
  const actual = await vi.importActual<typeof import("../src/api/events")>("../src/api/events");
  return {
    ...actual,
    submitEvent: (...args: unknown[]) => submitMock(...args),
    createEvent: (...args: unknown[]) => createMock(...args),
    updateEvent: (...args: unknown[]) => updateMock(...args)
  };
});

describe("editor handlers", () => {
  const mountWithRouter = async (path = "/login") => {
    const router = createTestRouter(path);
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } });
    return { wrapper, router };
  };
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
  type Exposed = {
    setRole: (value: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => void;
    handleSaveDraft: () => Promise<boolean>;
    handleSaveAndSubmit: () => Promise<boolean>;
    handleSubmitDraft: (id?: string) => Promise<boolean>;
    getEditorFormValues: () => CreateEventPayload;
    startEdit: (event: {
      id: string;
      title: string;
      content?: string;
      image: string;
      categoryId: string;
      eventStartAt: string;
      eventEndAt: string;
      allDay?: boolean;
      venueName: string;
      address?: string;
      postalCode?: string;
      city: string;
      latitude: number;
      longitude: number;
      organizerName?: string;
      organizerUrl?: string;
      contactEmail?: string;
      contactPhone?: string;
      ticketUrl?: string;
      websiteUrl?: string;
      status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
      rejectionReason?: string | null;
    }) => void;
  };

  beforeEach(() => {
    submitMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: FetchInput) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.startsWith("/api/uploads")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ url: "/uploads/test.png" })
          });
        }
        if (url.startsWith("/api/geocoding")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ latitude: 46.97, longitude: 0.7 })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not submit when no target id", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await vm.handleSubmitDraft();

    expect(submitMock).not.toHaveBeenCalled();
  });

  it("does not submit when role cannot edit", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("VISITOR");
    await vm.handleSubmitDraft("1");

    expect(submitMock).not.toHaveBeenCalled();
  });

  it("does not save when role cannot edit", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("VISITOR");
    await vm.handleSaveDraft();

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("prevents duplicate draft creation while save is in progress", async () => {
    let resolveCreate: ((value: unknown) => void) | null = null;
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    editorStore.editorForm.title = "Concert";
    editorStore.editorForm.categoryId = "music";
    editorStore.editorForm.eventStartAt = "2026-01-15";
    editorStore.editorForm.eventEndAt = "2026-01-15";
    editorStore.editorForm.venueName = "Salle";
    editorStore.editorForm.city = "Descartes";
    vm.setRole("EDITOR");

    const firstSave = vm.handleSaveDraft();
    const secondSave = vm.handleSaveDraft();

    await flushPromises();
    expect(createMock).toHaveBeenCalledTimes(1);
    await expect(secondSave).resolves.toBe(false);

    if (!resolveCreate) {
      throw new Error("Create resolver not set");
    }

    resolveCreate({
      id: "created-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });

    await expect(firstSave).resolves.toBe(true);
  });

  it("sets unknown editor error on save", async () => {
    createMock.mockRejectedValue("nope");
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed & { getEditorError: () => string | null };
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    vm.setRole("EDITOR");
    await vm.handleSaveDraft();

    expect(vm.getEditorError()).toBe("Erreur inconnue");
  });

  it("sets unknown editor error on submit", async () => {
    submitMock.mockRejectedValue("nope");
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed & { getEditorError: () => string | null };
    vm.setRole("EDITOR");
    await vm.handleSubmitDraft("1");

    expect(vm.getEditorError()).toBe("Erreur inconnue");
  });

  it("requires image before saving", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed & { getEditorError: () => string | null };
    vm.setRole("EDITOR");
    await vm.handleSaveDraft();

    expect(vm.getEditorError()).toBe("L'image est requise.");
  });

  it("creates then submits from create mode", async () => {
    createMock.mockResolvedValue({
      id: "created-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });
    submitMock.mockResolvedValue({
      id: "created-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "PENDING"
    });

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    editorStore.editorForm.title = "Concert";
    editorStore.editorForm.categoryId = "music";
    editorStore.editorForm.eventStartAt = "2026-01-15";
    editorStore.editorForm.eventEndAt = "2026-01-15";
    editorStore.editorForm.venueName = "Salle";
    editorStore.editorForm.city = "Descartes";
    vm.setRole("EDITOR");

    await vm.handleSaveAndSubmit();

    expect(createMock).toHaveBeenCalledOnce();
    expect(submitMock).toHaveBeenCalledWith("created-1", "EDITOR");
  });

  it("keeps editor state after saving a new draft", async () => {
    createMock.mockResolvedValue({
      id: "created-keep-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      audienceId: "all",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    editorStore.editorForm.title = "Concert";
    editorStore.editorForm.categoryId = "music";
    editorStore.editorForm.audienceId = "all";
    editorStore.editorForm.eventStartAt = "2026-01-15";
    editorStore.editorForm.eventEndAt = "2026-01-15";
    editorStore.editorForm.venueName = "Salle";
    editorStore.editorForm.city = "Descartes";
    vm.setRole("EDITOR");

    await expect(vm.handleSaveDraft()).resolves.toBe(true);

    expect(editorStore.editorMode).toBe("edit");
    expect(editorStore.editingEventId).toBe("created-keep-1");
    expect(editorStore.editorForm.title).toBe("Concert");
    expect(editorStore.editorForm.image).toBe("/uploads/test.png");
  });

  it("serializes social links in the editor payload", async () => {
    createMock.mockResolvedValue({
      id: "created-social-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      audienceId: "all",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }],
      status: "DRAFT"
    });

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    editorStore.editorForm.title = "Concert";
    editorStore.editorForm.categoryId = "music";
    editorStore.editorForm.audienceId = "all";
    editorStore.editorForm.eventStartAt = "2026-01-15";
    editorStore.editorForm.eventEndAt = "2026-01-15";
    editorStore.editorForm.venueName = "Salle";
    editorStore.editorForm.city = "Descartes";
    editorStore.editorForm.socialLinks = [{ type: "FACEBOOK", url: " https://facebook.com/rene " }];
    vm.setRole("EDITOR");

    await vm.handleSaveDraft();

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        socialLinks: [{ type: "FACEBOOK", url: "https://facebook.com/rene" }]
      }),
      "EDITOR"
    );
  });

  it("prevents duplicate save and submit while submission is in progress", async () => {
    let resolveCreate: ((value: unknown) => void) | null = null;
    let resolveSubmit: ((value: unknown) => void) | null = null;
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    submitMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
    );

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    editorStore.editorForm.title = "Concert";
    editorStore.editorForm.categoryId = "music";
    editorStore.editorForm.eventStartAt = "2026-01-15T20:00";
    editorStore.editorForm.eventEndAt = "2026-01-15T22:00";
    editorStore.editorForm.venueName = "Salle";
    editorStore.editorForm.city = "Descartes";
    vm.setRole("EDITOR");

    const firstSubmit = vm.handleSaveAndSubmit();
    const secondSubmit = vm.handleSaveAndSubmit();

    await flushPromises();
    expect(createMock).toHaveBeenCalledTimes(1);
    await expect(secondSubmit).resolves.toBe(false);

    if (!resolveCreate) {
      throw new Error("Create resolver not set");
    }

    resolveCreate({
      id: "created-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });

    await flushPromises();
    expect(submitMock).toHaveBeenCalledTimes(1);

    if (!resolveSubmit) {
      throw new Error("Submit resolver not set");
    }

    resolveSubmit({
      id: "created-1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "PENDING"
    });

    await expect(firstSubmit).resolves.toBe(true);
  });

  it("does not submit when create step fails in save and submit flow", async () => {
    createMock.mockRejectedValue(new Error("Création impossible"));

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed & { getEditorError: () => string | null };
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    vm.setRole("EDITOR");

    await vm.handleSaveAndSubmit();

    expect(submitMock).not.toHaveBeenCalled();
    expect(vm.getEditorError()).toBe("Création impossible");
  });

  it("keeps created event and surfaces submit error in save and submit flow", async () => {
    createMock.mockResolvedValue({
      id: "created-2",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });
    submitMock.mockRejectedValue(new Error("Soumission impossible"));

    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed & { getEditorError: () => string | null };
    const editorStore = useEditorStore();
    editorStore.editorForm.image = "/uploads/test.png";
    vm.setRole("EDITOR");

    await vm.handleSaveAndSubmit();

    expect(createMock).toHaveBeenCalledOnce();
    expect(submitMock).toHaveBeenCalledWith("created-2", "EDITOR");
    expect(vm.getEditorError()).toBe("Soumission impossible");
  });

  it("saves then submits in edit mode from save and submit flow", async () => {
    updateMock.mockResolvedValue({
      id: "1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });
    submitMock.mockResolvedValue({
      id: "1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "PENDING"
    });

    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await nextTick();
    await router.push("/backoffice/events/new");
    await flushPromises();
    await nextTick();
    vm.startEdit({
      id: "1",
      title: "Concert",
      image: "img",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });

    await vm.handleSaveAndSubmit();

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ title: "Concert" }),
      "EDITOR"
    );
    expect(submitMock).toHaveBeenCalledWith("1", "EDITOR");
  });

  it("saves then submits when editing a published event", async () => {
    updateMock.mockResolvedValue({
      id: "1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "PUBLISHED",
      pendingRevision: {
        id: "revision-1",
        eventId: "1",
        title: "Concert",
        image: "/uploads/test.png",
        categoryId: "music",
        eventStartAt: "2026-01-15T20:00:00.000Z",
        eventEndAt: "2026-01-15T22:00:00.000Z",
        venueName: "Salle",
        city: "Descartes",
        latitude: 46.97,
        longitude: 0.7,
        status: "DRAFT"
      }
    });
    submitMock.mockResolvedValue({
      id: "1",
      title: "Concert",
      image: "/uploads/test.png",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "PUBLISHED",
      pendingRevision: {
        id: "revision-1",
        eventId: "1",
        title: "Concert",
        image: "/uploads/test.png",
        categoryId: "music",
        eventStartAt: "2026-01-15T20:00:00.000Z",
        eventEndAt: "2026-01-15T22:00:00.000Z",
        venueName: "Salle",
        city: "Descartes",
        latitude: 46.97,
        longitude: 0.7,
        status: "PENDING"
      }
    });

    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await nextTick();
    await router.push("/backoffice/events/new");
    await flushPromises();
    await nextTick();
    vm.startEdit({
      id: "1",
      title: "Concert",
      image: "img",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "PUBLISHED"
    });

    await vm.handleSaveAndSubmit();

    expect(updateMock).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ title: "Concert" }),
      "EDITOR"
    );
    expect(submitMock).toHaveBeenCalledWith("1", "EDITOR");
  });

  it("clears invalid date values on edit", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await nextTick();
    await router.push("/backoffice/events/new");
    await flushPromises();
    await nextTick();
    vm.startEdit({
      id: "1",
      title: "Concert",
      content: "Desc",
      image: "img",
      categoryId: "music",
      eventStartAt: "invalid",
      eventEndAt: "invalid",
      allDay: false,
      venueName: "Salle",
      postalCode: "37100",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Asso",
      status: "DRAFT"
    });
    await nextTick();

    const dateInputs = wrapper.findAll('input[type="date"]');
    expect((dateInputs[0].element as HTMLInputElement).value).toBe("");
    expect((dateInputs[1].element as HTMLInputElement).value).toBe("");
  });

  it("populates editor fields on edit", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await nextTick();
    await router.push("/backoffice/events/new");
    await flushPromises();
    await nextTick();
    vm.startEdit({
      id: "1",
      title: "Concert",
      content: "Desc",
      image: "img",
      categoryId: "music",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      allDay: false,
      venueName: "Salle",
      address: "Rue",
      postalCode: "37100",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      organizerName: "Asso",
      organizerUrl: "https://example.com",
      contactEmail: "contact@example.com",
      contactPhone: "0102030405",
      ticketUrl: "https://tickets.example.com",
      websiteUrl: "https://example.com",
      status: "DRAFT"
    });
    await nextTick();

    expect(wrapper.find('input[placeholder="Titre de l\'événement"]').element).toHaveProperty(
      "value",
      "Concert"
    );
  });

  it("defaults missing optional fields on edit", async () => {
    window.localStorage.setItem("rene-auth-role", "EDITOR");
    const { wrapper, router } = await mountWithRouter("/login");
    await flushPromises();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    for (let i = 0; i < 4; i += 1) {
      if (router.currentRoute.value.path === "/backoffice/events") {
        break;
      }
      await flushPromises();
      await nextTick();
    }
    vm.startEdit({
      id: "1",
      title: "Concert",
      image: "img",
      categoryId: "music",
      eventStartAt: "2026-01-15T00:00:00.000Z",
      eventEndAt: "2026-01-15T23:59:59.999Z",
      venueName: "Salle",
      city: "Descartes",
      latitude: 46.97,
      longitude: 0.7,
      status: "DRAFT"
    });
    await nextTick();

    const values = vm.getEditorFormValues();

    expect(values.content).toBe("");
    expect(values.address).toBe("");
    expect(values.postalCode).toBe("");
  });
});
