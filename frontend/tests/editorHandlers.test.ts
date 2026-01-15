import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { vi } from "vitest";
import App from "../src/App.vue";
import { CreateEventPayload } from "../src/api/events";
import { createTestRouter } from "./testRouter";

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
    const wrapper = mount(App, { global: { plugins: [router] } });
    return { wrapper, router };
  };
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
  type Exposed = {
    setRole: (value: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => void;
    handleSaveDraft: () => Promise<void>;
    handleSubmitDraft: (id?: string) => Promise<void>;
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
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
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

  it("sets unknown editor error on save", async () => {
    createMock.mockRejectedValue("nope");
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed & { getEditorError: () => string | null };
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

  it("clears invalid date values on edit", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await nextTick();
    await router.push("/backoffice");
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

    const dateInputs = wrapper.findAll('input[type="datetime-local"]');
    expect((dateInputs[0].element as HTMLInputElement).value).toBe("");
    expect((dateInputs[1].element as HTMLInputElement).value).toBe("");
  });

  it("populates editor fields on edit", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("EDITOR");
    await nextTick();
    await router.push("/backoffice");
    await flushPromises();
    await nextTick();
    vm.startEdit({
      id: "1",
      title: "Concert",
      content: "Desc",
      image: "img",
      categoryId: "music",
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
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
      if (router.currentRoute.value.path === "/backoffice") {
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
      eventStartAt: "2026-01-15T20:00:00.000Z",
      eventEndAt: "2026-01-15T22:00:00.000Z",
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