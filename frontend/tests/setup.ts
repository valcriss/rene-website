import "@testing-library/jest-dom";
import { config } from "@vue/test-utils";
import { beforeEach } from "vitest";
import { i18n, setLocale } from "../src/i18n";

config.global.plugins = [...(config.global.plugins ?? []), i18n];

window.scrollTo = () => {};

// jsdom's Blob implementation is not compatible with Node's Blob URL APIs.
URL.createObjectURL = () => "blob:mock-url";
URL.revokeObjectURL = () => {};

beforeEach(() => {
  setLocale("fr");
});
