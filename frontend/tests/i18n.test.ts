import { describe, expect, it, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import Header from "../src/components/navigation/Header.vue";
import { i18n, installI18n, resolveInitialLocale, setLocale, getCurrentLocale, getCurrentLocaleTag } from "../src/i18n";

describe("i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLocale("fr");
  });

  it("resolves locale from storage, browser, and fallback", () => {
    window.localStorage.setItem("rene-website-locale", "en");
    expect(resolveInitialLocale()).toBe("en");

    window.localStorage.removeItem("rene-website-locale");
    Object.defineProperty(window.navigator, "language", { value: "en-US", configurable: true });
    expect(resolveInitialLocale()).toBe("en");

    Object.defineProperty(window.navigator, "language", { value: "es-ES", configurable: true });
    expect(resolveInitialLocale()).toBe("fr");
  });

  it("installs and persists locale changes", async () => {
    const use = vi.fn();
    installI18n({ use } as never);
    expect(use).toHaveBeenCalledWith(i18n);

    setLocale("en");
    await nextTick();

    expect(getCurrentLocale()).toBe("en");
    expect(getCurrentLocaleTag()).toBe("en-US");
    expect(window.localStorage.getItem("rene-website-locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches locale from header buttons", async () => {
    setActivePinia(createPinia());
    const wrapper = mount(Header, { props: { showLogin: false } });

    await wrapper.findAll("button")[1].trigger("click");

    expect(getCurrentLocale()).toBe("en");
    expect(wrapper.text()).toContain("Cultural agenda");
  });

  it("falls back to fr for unsupported locale values and handles non-browser install", () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    i18n.global.locale.value = "es" as never;
    expect(getCurrentLocale()).toBe("fr");
    expect(getCurrentLocaleTag()).toBe("fr-FR");

    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");

    const use = vi.fn();
    expect(() => installI18n({ use } as never)).not.toThrow();
    expect(use).toHaveBeenCalledWith(i18n);

    Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true });
    setLocale("fr");
  });
});
