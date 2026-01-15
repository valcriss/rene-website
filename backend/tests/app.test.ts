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

  it("does not register static in non-production", () => {
    process.env.NODE_ENV = "development";
    createApp();
    expect(registerStaticMock).not.toHaveBeenCalled();
  });

  it("registers static in production", () => {
    process.env.NODE_ENV = "production";
    createApp();
    expect(registerStaticMock).toHaveBeenCalled();
  });
});
