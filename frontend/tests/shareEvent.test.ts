import { mount, flushPromises } from "@vue/test-utils";
import { vi } from "vitest";
import ShareEvent from "../src/components/events/ShareEvent.vue";
import { buildFacebookShareUrl, buildLinkedInShareUrl, buildXShareUrl } from "../src/utils/shareLinks"; // gitleaks:allow

const SHARE_URL = "https://rene.example.org/evenements/concert-descartes-2026";
const TITLE = "Concert de rentrée";

const mountShareEvent = () => mount(ShareEvent, { props: { url: SHARE_URL, title: TITLE } });

type ShareInput = { title?: string; url?: string };

const setNativeShare = (impl?: (data?: ShareInput) => Promise<void>) => {
  if (impl) {
    Object.defineProperty(navigator, "share", { value: vi.fn(impl), configurable: true });
  } else {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  }
};

const setClipboard = (writeText?: (text: string) => Promise<void>) => {
  if (writeText) {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(writeText) }, configurable: true });
  } else {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  }
};

// jsdom does not implement document.execCommand at all, so there is nothing for vi.spyOn to
// wrap — define a stub first, then each test replaces its return value.
const setExecCommand = (impl: () => boolean) => {
  Object.defineProperty(document, "execCommand", { value: vi.fn(impl), configurable: true, writable: true });
  return document.execCommand as unknown as ReturnType<typeof vi.fn>;
};

describe("ShareEvent", () => {
  beforeEach(() => {
    setNativeShare(undefined);
    setClipboard(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("always builds explicit share links from the canonical URL, with accessible labels", () => {
    const wrapper = mountShareEvent();

    const facebookLink = wrapper.find(`a[href='${buildFacebookShareUrl(SHARE_URL)}']`);
    const linkedInLink = wrapper.find(`a[href='${buildLinkedInShareUrl(SHARE_URL)}']`);
    const xLink = wrapper.find(`a[href='${buildXShareUrl(SHARE_URL, TITLE)}']`);

    expect(facebookLink.exists()).toBe(true);
    expect(facebookLink.attributes("target")).toBe("_blank");
    expect(facebookLink.attributes("rel")).toBe("noopener noreferrer");
    expect(facebookLink.attributes("aria-label")).toBe("Partager sur Facebook");
    expect(linkedInLink.exists()).toBe(true);
    expect(linkedInLink.attributes("aria-label")).toBe("Partager sur LinkedIn");
    expect(xLink.exists()).toBe(true);
    expect(xLink.attributes("aria-label")).toBe("Partager sur X");
  });

  it("does not render the native share button when the Web Share API is unavailable", async () => {
    const wrapper = mountShareEvent();
    await wrapper.vm.$nextTick();

    expect(wrapper.find("[data-testid='share-native-button']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='share-copy-button']").exists()).toBe(true);
  });

  it("renders the native share button when available and shares the canonical URL and title", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    setNativeShare(shareMock);

    const wrapper = mountShareEvent();
    await wrapper.vm.$nextTick();

    const nativeButton = wrapper.find("[data-testid='share-native-button']");
    expect(nativeButton.exists()).toBe(true);

    await nativeButton.trigger("click");
    await flushPromises();

    expect(shareMock).toHaveBeenCalledWith({ title: TITLE, url: SHARE_URL });
  });

  it("silently ignores a cancelled or rejected native share request", async () => {
    setNativeShare(() => Promise.reject(new DOMException("cancelled", "AbortError")));

    const wrapper = mountShareEvent();
    await wrapper.vm.$nextTick();

    await wrapper.find("[data-testid='share-native-button']").trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='share-copy-status']").exists()).toBe(false);
  });

  it("copies the canonical link via the Clipboard API and shows a confirmation that clears itself", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    const wrapper = mountShareEvent();
    await wrapper.find("[data-testid='share-copy-button']").trigger("click");
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    const status = wrapper.find("[data-testid='share-copy-status']");
    expect(status.exists()).toBe(true);
    expect(status.text()).toBe("Lien copié dans le presse-papiers !");

    await vi.advanceTimersByTimeAsync(2600);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("[data-testid='share-copy-status']").exists()).toBe(false);
  });

  it("falls back to execCommand when the Clipboard API is unavailable", async () => {
    setClipboard(undefined);
    const execCommandSpy = setExecCommand(() => true);

    const wrapper = mountShareEvent();
    await wrapper.find("[data-testid='share-copy-button']").trigger("click");
    await flushPromises();

    expect(execCommandSpy).toHaveBeenCalledWith("copy");
    expect(wrapper.find("[data-testid='share-copy-status']").text()).toBe("Lien copié dans le presse-papiers !");
  });

  it("reports an error state when the Clipboard API and the execCommand fallback both fail", async () => {
    setClipboard(undefined);
    setExecCommand(() => false);

    const wrapper = mountShareEvent();
    await wrapper.find("[data-testid='share-copy-button']").trigger("click");
    await flushPromises();

    const status = wrapper.find("[data-testid='share-copy-status']");
    expect(status.exists()).toBe(true);
    expect(status.text()).toBe("Impossible de copier le lien.");
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    setClipboard(() => Promise.reject(new Error("denied")));
    setExecCommand(() => true);

    const wrapper = mountShareEvent();
    await wrapper.find("[data-testid='share-copy-button']").trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='share-copy-status']").text()).toBe("Lien copié dans le presse-papiers !");
  });

  it("reports an error state when execCommand itself throws", async () => {
    setClipboard(undefined);
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => {
        throw new Error("blocked");
      }),
      configurable: true,
      writable: true
    });

    const wrapper = mountShareEvent();
    await wrapper.find("[data-testid='share-copy-button']").trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='share-copy-status']").text()).toBe("Impossible de copier le lien.");
  });

  it("clears the pending confirmation timer on unmount", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const wrapper = mountShareEvent();
    await wrapper.find("[data-testid='share-copy-button']").trigger("click");
    await flushPromises();

    wrapper.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
