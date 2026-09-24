import { beforeEach } from "vitest";
import { i18n, setLocale } from "../src/i18n";

// A handful of test files opt into the plain Node environment (no window/document at all) to
// exercise SSR-only code paths; the browser-oriented setup below is meaningless there and some
// of it (jest-dom's matchers, @vue/test-utils config) would throw without a DOM.
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom");
  const { config } = await import("@vue/test-utils");
  const { createHead } = await import("@unhead/vue/client");

  config.global.plugins = [...(config.global.plugins ?? []), i18n, createHead()];

  window.scrollTo = () => {};

  // jsdom's Blob implementation is not compatible with Node's Blob URL APIs.
  URL.createObjectURL = () => "blob:mock-url";
  URL.revokeObjectURL = () => {};

  // jsdom does not implement IntersectionObserver at all. Components that use it to defer
  // work until they approach the viewport (e.g. EventMap's lazy map mount) get a stand-in that
  // reports every observed element as intersecting on the next microtask — close enough to real
  // browser timing that existing "await a tick, then assert" tests need no special-casing.
  if (typeof window.IntersectionObserver === "undefined") {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = "";
      readonly thresholds: ReadonlyArray<number> = [];
      private readonly callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

      constructor(callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void) {
        this.callback = callback;
      }

      observe(target: Element) {
        queueMicrotask(() => {
          this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
        });
      }

      unobserve() {
        // no-op: nothing to track for the mock
      }

      disconnect() {
        // no-op: nothing to track for the mock
      }

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  }
}

beforeEach(() => {
  setLocale("fr");
});
