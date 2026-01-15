import { mount } from "@vue/test-utils";
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
const rejectMock = vi.fn();

vi.mock("../src/api/moderation", () => ({
  publishEvent: (...args: unknown[]) => publishMock(...args),
  rejectEvent: (...args: unknown[]) => rejectMock(...args)
}));

describe("moderation handlers", () => {
  const mountWithRouter = async (path = "/login") => {
    const router = createTestRouter(path);
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    return { wrapper, router };
  };
  type Exposed = {
    setRole: (value: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => void;
    handlePublish: (id: string) => Promise<void>;
    handleReject: (id: string) => Promise<void>;
    getModerationError: () => string | null;
    setRejectionReason: (id: string, value: string) => void;
  };

  beforeEach(() => {
    publishMock.mockReset();
    rejectMock.mockReset();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when role is not moderator", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("VISITOR");
    vm.setRejectionReason("1", "Motif");
    await vm.handlePublish("1");
    await vm.handleReject("1");

    expect(publishMock).not.toHaveBeenCalled();
    expect(rejectMock).not.toHaveBeenCalled();
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
});
