import { beforeEach } from "vitest";
import { i18n, setLocale } from "../src/i18n";

// A handful of test files opt into the plain Node environment (no window/document at all) to
// exercise SSR-only code paths; the browser-oriented setup below is meaningless there and some
// of it (jest-dom's matchers, @vue/test-utils config) would throw without a DOM.
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom");
  const { config } = await import("@vue/test-utils");

  config.global.plugins = [...(config.global.plugins ?? []), i18n];

  window.scrollTo = () => {};

  // jsdom's Blob implementation is not compatible with Node's Blob URL APIs.
  URL.createObjectURL = () => "blob:mock-url";
  URL.revokeObjectURL = () => {};
}

beforeEach(() => {
  setLocale("fr");
});
