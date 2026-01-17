"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
jest.mock("../src/events/service", () => {
    const actual = jest.requireActual("../src/events/service");
    return {
        ...actual,
        deleteEvent: jest.fn(async () => ({ ok: false, errors: ["Autre erreur"] }))
    };
});
const routes_1 = require("../src/events/routes");
describe("events routes delete errors", () => {
    const authRepo = {
        getUserByEmail: async () => null,
        getUserById: async () => null,
        listUsersByRole: async () => []
    };
    it("returns 400 for delete errors", async () => {
        const repo = {
            list: async () => [],
            getById: async () => null,
            create: async () => {
                throw new Error("boom");
            },
            update: async () => null,
            delete: async () => false,
            updateStatus: async () => null
        };
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createEventRouter)(repo, authRepo));
        const response = await (0, supertest_1.default)(app)
            .delete("/api/events/whatever")
            .set("x-user-role", "EDITOR");
        expect(response.status).toBe(400);
        expect(response.body.errors).toContain("Autre erreur");
    });
});
