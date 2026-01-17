"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const listenMock = jest.fn((_port, callback) => {
    callback();
    return { close: jest.fn() };
});
jest.mock("../src/app", () => ({
    createApp: () => ({
        listen: listenMock
    })
}));
const index_1 = require("../src/index");
describe("startServer", () => {
    const originalPort = process.env.PORT;
    afterEach(() => {
        listenMock.mockClear();
        if (originalPort === undefined) {
            delete process.env.PORT;
        }
        else {
            process.env.PORT = originalPort;
        }
    });
    it("starts listening on the provided port", () => {
        const server = (0, index_1.startServer)(4567);
        expect(listenMock).toHaveBeenCalledWith(4567, expect.any(Function));
        expect(server).toEqual({ close: expect.any(Function) });
    });
    it("uses PORT env when provided", () => {
        process.env.PORT = "4000";
        (0, index_1.startServer)();
        expect(listenMock).toHaveBeenCalledWith(4000, expect.any(Function));
    });
    it("defaults to 3000 when PORT is missing", () => {
        delete process.env.PORT;
        (0, index_1.startServer)();
        expect(listenMock).toHaveBeenCalledWith(3000, expect.any(Function));
    });
    it("does not start when not main", () => {
        (0, index_1.runIfMain)(false);
        expect(listenMock).not.toHaveBeenCalled();
    });
    it("starts when main", () => {
        (0, index_1.runIfMain)(true);
        expect(listenMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Function));
    });
});
