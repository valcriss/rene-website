import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { vi } from "vitest";
import App from "../src/App.vue";
import { createTestRouter } from "./testRouter";

vi.mock("../src/components/EventMap.vue", () => ({
  default: {
    name: "EventMap",
    props: ["events"],
    template: "<div></div>"
  }
}));

const publishMock = vi.fn();
const updateFeaturedMock = vi.fn();
const rejectMock = vi.fn();

vi.mock("../src/api/moderation", () => ({
  publishEventWithFeatured: (...args: unknown[]) => publishMock(...args),
  updateEventFeatured: (...args: unknown[]) => updateFeaturedMock(...args),
  rejectEvent: (...args: unknown[]) => rejectMock(...args)
}));

describe("moderation handlers", () => {
  const mountedWrappers: Array<ReturnType<typeof mount>> = [];
  const mountWithRouter = async (path = "/login") => {
    const router = createTestRouter(path);
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } });
    mountedWrappers.push(wrapper);
    return { wrapper, router };
  };
  type Exposed = {
    setRole: (value: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => void;
    handlePublish: (id: string) => Promise<void>;
    handleUpdateFeatured: (id: string, featured: boolean) => Promise<void>;
    handleReject: (id: string) => Promise<void>;
    getModerationError: () => string | null;
    setRejectionReason: (id: string, value: string) => void;
    setFeaturedEvent: (id: string, value: boolean) => void;
  };

  beforeEach(() => {
    publishMock.mockReset();
    updateFeaturedMock.mockReset();
    rejectMock.mockReset();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it("does nothing when role is not moderator", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("VISITOR");
    vm.setRejectionReason("1", "Motif");
    vm.setFeaturedEvent("1", true);
    await vm.handlePublish("1");
    await vm.handleUpdateFeatured("1", true);
    await vm.handleReject("1");

    expect(publishMock).not.toHaveBeenCalled();
    expect(updateFeaturedMock).not.toHaveBeenCalled();
    expect(rejectMock).not.toHaveBeenCalled();
  });

  it("publishes with featured state", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("MODERATOR");
    vm.setFeaturedEvent("1", true);
    await vm.handlePublish("1");

    expect(publishMock).toHaveBeenCalledWith("1", "MODERATOR", true);
  });

  it("sets unknown error on reject", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    rejectMock.mockRejectedValue("nope");
    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("MODERATOR");
    await vm.handleReject("1");

    expect(vm.getModerationError()).toBe("Erreur inconnue");
  });

  it("updates featured state on published events", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await vm.handleUpdateFeatured("1", false);

    expect(updateFeaturedMock).toHaveBeenCalledWith("1", "ADMIN", false);
  });
});
