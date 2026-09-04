import "@testing-library/jest-dom";
import { config } from "@vue/test-utils";
import { beforeEach } from "vitest";
import { i18n, setLocale } from "../src/i18n";

config.global.plugins = [...(config.global.plugins ?? []), i18n];

window.scrollTo = () => {};

// jsdom does not implement the Blob URL APIs used for local image previews.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => "blob:mock-url";
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}

beforeEach(() => {
  setLocale("fr");
});
