const registerStaticMock = jest.fn();

jest.mock("../src/static", () => ({
  registerStatic: registerStaticMock
}));

import { createApp } from "../src/app";

describe("createApp", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    registerStaticMock.mockClear();
  });

  it("does not register static in the test environment", () => {
    process.env.NODE_ENV = "test";
    createApp();
    expect(registerStaticMock).not.toHaveBeenCalled();
  });

  it("registers static in development (so SSR is exercised outside production too)", () => {
    process.env.NODE_ENV = "development";
    createApp();
    expect(registerStaticMock).toHaveBeenCalled();
  });

  it("registers static in production", () => {
    process.env.NODE_ENV = "production";
    createApp();
    expect(registerStaticMock).toHaveBeenCalled();
  });
});
