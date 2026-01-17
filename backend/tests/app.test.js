"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registerStaticMock = jest.fn();
jest.mock("../src/static", () => ({
    registerStatic: registerStaticMock
}));
const app_1 = require("../src/app");
describe("createApp", () => {
    const originalEnv = process.env.NODE_ENV;
    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        registerStaticMock.mockClear();
    });
    it("does not register static in non-production", () => {
        process.env.NODE_ENV = "development";
        (0, app_1.createApp)();
        expect(registerStaticMock).not.toHaveBeenCalled();
    });
    it("registers static in production", () => {
        process.env.NODE_ENV = "production";
        (0, app_1.createApp)();
        expect(registerStaticMock).toHaveBeenCalled();
    });
});
