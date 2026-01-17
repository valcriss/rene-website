"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const routes_1 = require("../src/events/routes");
jest.mock("../src/notifications/service", () => ({
    notifyEventSubmitted: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
    notifyEventResubmitted: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
    notifyEventPublished: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
    notifyEventRejected: jest.fn(async () => ({ ok: false, errors: ["boom"] })),
    notifyEventDeleted: jest.fn(async () => ({ ok: false, errors: ["boom"] }))
}));
const baseEvent = {
    id: "1",
    title: "Concert",
    content: "Texte",
    image: "https://example.com/img.png",
    createdByUserId: null,
    categoryId: "music",
    eventStartAt: "2026-01-15T20:00:00.000Z",
    eventEndAt: "2026-01-15T22:00:00.000Z",
    allDay: false,
    venueName: "Salle",
    address: "1 rue",
    postalCode: "37160",
    city: "Descartes",
    latitude: 46.97,
    longitude: 0.7,
    organizerName: "Association",
    status: "DRAFT",
    publishedAt: null,
    publicationEndAt: "2026-01-15T22:00:00.000Z",
    rejectionReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
};
const authRepo = {
    getUserByEmail: async () => null,
    getUserById: async () => null,
    listUsersByRole: async () => []
};
const buildRepo = (event) => ({
    list: async () => [event],
    getById: async () => event,
    create: async () => event,
    update: async () => event,
    delete: async () => true,
    updateStatus: async (_id, status, data) => ({
        ...event,
        status,
        publishedAt: data.publishedAt,
        rejectionReason: data.rejectionReason,
        publicationEndAt: data.publicationEndAt
    })
});
describe("events routes notification warnings", () => {
    it("logs warning when submit notification fails", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createEventRouter)(buildRepo(baseEvent), authRepo));
        const response = await (0, supertest_1.default)(app)
            .post("/api/events/1/submit")
            .set("x-user-role", "EDITOR");
        expect(response.status).toBe(200);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
    it("logs warning when resubmission notification fails", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createEventRouter)(buildRepo({ ...baseEvent, status: "REJECTED" }), authRepo));
        const response = await (0, supertest_1.default)(app)
            .post("/api/events/1/submit")
            .set("x-user-role", "EDITOR");
        expect(response.status).toBe(200);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
    it("logs warning when publish notification fails", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createEventRouter)(buildRepo(baseEvent), authRepo));
        const response = await (0, supertest_1.default)(app)
            .post("/api/events/1/publish")
            .set("x-user-role", "MODERATOR");
        expect(response.status).toBe(200);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
    it("logs warning when reject notification fails", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createEventRouter)(buildRepo(baseEvent), authRepo));
        const response = await (0, supertest_1.default)(app)
            .post("/api/events/1/reject")
            .set("x-user-role", "MODERATOR")
            .send({ rejectionReason: "Motif" });
        expect(response.status).toBe(200);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
    it("logs warning when delete notification fails", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use("/api", (0, routes_1.createEventRouter)(buildRepo(baseEvent), authRepo));
        const response = await (0, supertest_1.default)(app)
            .delete("/api/events/1")
            .set("x-user-role", "EDITOR");
        expect(response.status).toBe(200);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
