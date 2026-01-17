import { mount } from "@vue/test-utils";
import { vi } from "vitest";
import EventDetailPage from "../src/pages/EventDetailPage.vue";
import { createTestRouter } from "./testRouter";

const makeWrapper = async () => {
  const router = createTestRouter("/event/123");
  await router.isReady();
  const wrapper = mount(EventDetailPage, {
    global: {
      plugins: [router],
      stubs: {
        NavigationHeader: {
          template: "<button data-testid='login' @click=\"$emit('login')\"></button>"
        },
        EventDetailView: {
          template:
            "<div><slot name='header'></slot><button data-testid='select' @click=\"$emit('select','42')\"></button></div>"
        }
      }
    }
  });
  return { router, wrapper };
};

describe("EventDetailPage", () => {
  it("navigates using header actions", async () => {
    const { router, wrapper } = await makeWrapper();
    const pushSpy = vi.spyOn(router, "push");

    const headerButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Retour"));
    await headerButton?.trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/");

    await wrapper.find("[data-testid='login']").trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/login");

    await wrapper.find("[data-testid='select']").trigger("click");
    expect(pushSpy).toHaveBeenCalledWith("/event/42");
  });
});
