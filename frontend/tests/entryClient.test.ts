import { describe, it, expect, vi, beforeEach } from "vitest";

const mountMock = vi.fn();
const isReadyMock = vi.fn(() => Promise.resolve());
const routerMock = { isReady: isReadyMock };
const piniaMock = { state: { value: {} as Record<string, unknown> } };
const appMock = { mount: mountMock };

const createAppMock = vi.fn(() => ({ app: appMock, router: routerMock, pinia: piniaMock }));
const restoreSessionMock = vi.fn(() => Promise.resolve());

vi.mock("../src/appFactory", () => ({
  createApp: createAppMock
}));

vi.mock("../src/stores/auth", () => ({
  useAuthStore: () => ({ restoreSession: restoreSessionMock })
}));

vi.mock("../src/styles.css", () => ({}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("entry-client", () => {
  beforeEach(() => {
    vi.resetModules();
    mountMock.mockClear();
    isReadyMock.mockClear();
    createAppMock.mockClear();
    restoreSessionMock.mockClear();
    piniaMock.state.value = {};
    document.body.innerHTML = "";
  });

  it("mounts the app after the router is ready", async () => {
    await import("../src/entry-client");
    await flush();

    expect(createAppMock).toHaveBeenCalled();
    expect(restoreSessionMock).toHaveBeenCalled();
    expect(mountMock).toHaveBeenCalledWith("#app");
  });

  it("hydrates pinia state from the embedded SSR script tag", async () => {
    const script = document.createElement("script");
    script.id = "__PINIA_STATE__";
    script.type = "application/json";
    script.textContent = JSON.stringify({ auth: { role: "ADMIN" } });
    document.body.appendChild(script);

    await import("../src/entry-client");
    await flush();

    expect(piniaMock.state.value).toEqual({ auth: { role: "ADMIN" } });
    expect(mountMock).toHaveBeenCalledWith("#app");
  });

  it("falls back to a fresh client fetch when the embedded state is malformed", async () => {
    const script = document.createElement("script");
    script.id = "__PINIA_STATE__";
    script.type = "application/json";
    script.textContent = "{not valid json";
    document.body.appendChild(script);

    await import("../src/entry-client");
    await flush();

    expect(piniaMock.state.value).toEqual({});
    expect(mountMock).toHaveBeenCalledWith("#app");
  });

  it("mounts normally when there is no embedded state script", async () => {
    await import("../src/entry-client");
    await flush();

    expect(piniaMock.state.value).toEqual({});
    expect(mountMock).toHaveBeenCalledWith("#app");
  });
});
