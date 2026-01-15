import { describe, it, expect, vi, beforeEach } from "vitest";

const mountMock = vi.fn();
const useMock = vi.fn();
const createAppMock = vi.fn(() => ({
  use: useMock,
  mount: mountMock
}));

vi.mock("vue", () => ({
  createApp: createAppMock
}));

vi.mock("../src/App.vue", () => ({
  default: { name: "App" }
}));

const routerMock = { name: "router" };
vi.mock("../src/router", () => ({
  createAppRouter: () => routerMock
}));

vi.mock("../src/styles.css", () => ({}));

describe("main", () => {
  beforeEach(() => {
    mountMock.mockClear();
    createAppMock.mockClear();
    useMock.mockClear();
    vi.resetModules();
  });

  it("mounts the app", async () => {
    await import("../src/main");

    expect(createAppMock).toHaveBeenCalled();
    expect(useMock).toHaveBeenCalledWith(routerMock);
    expect(mountMock).toHaveBeenCalledWith("#app");
  });
});
