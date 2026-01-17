"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("../src/notifications/mailer", () => ({
    sendEmail: jest.fn(async () => ({ ok: true }))
}));
const mailer_1 = require("../src/notifications/mailer");
const service_1 = require("../src/notifications/service");
const baseEvent = {
    id: "1",
    title: "Concert",
    content: "Texte",
    image: "img",
    createdByUserId: "user-1",
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
    status: "PENDING",
    publishedAt: null,
    publicationEndAt: "2026-01-15T22:00:00.000Z",
    rejectionReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
};
describe("notifications service", () => {
    const authRepo = {
        getUserByEmail: async () => null,
        getUserById: async (id) => id === "user-1"
            ? { id: "user-1", name: "User", email: "user@test", role: "EDITOR", passwordHash: "hash" }
            : null,
        listUsersByRole: async () => [
            { id: "m1", name: "Mod", email: "mod@test", role: "MODERATOR", passwordHash: "hash" },
            { id: "a1", name: "Admin", email: "admin@test", role: "ADMIN", passwordHash: "hash" }
        ]
    };
    beforeEach(() => {
        mailer_1.sendEmail.mockClear();
        mailer_1.sendEmail.mockResolvedValue({ ok: true });
    });
    it("notifies moderators on submit", async () => {
        await (0, service_1.notifyEventSubmitted)(baseEvent, authRepo);
        expect(mailer_1.sendEmail).toHaveBeenCalledTimes(2);
    });
    it("notifies moderators on resubmission", async () => {
        await (0, service_1.notifyEventResubmitted)({ ...baseEvent, status: "PENDING" }, authRepo);
        expect(mailer_1.sendEmail).toHaveBeenCalledTimes(2);
    });
    it("skips submit when no moderators", async () => {
        const emptyRepo = {
            getUserByEmail: async () => null,
            getUserById: async () => null,
            listUsersByRole: async () => []
        };
        await (0, service_1.notifyEventSubmitted)(baseEvent, emptyRepo);
        expect(mailer_1.sendEmail).not.toHaveBeenCalled();
    });
    it("returns errors when notification fails", async () => {
        mailer_1.sendEmail.mockResolvedValueOnce({ ok: false, errors: ["boom"] });
        const result = await (0, service_1.notifyEventSubmitted)(baseEvent, authRepo);
        expect(result.ok).toBe(false);
    });
    it("notifies creator on publish", async () => {
        await (0, service_1.notifyEventPublished)({ ...baseEvent, status: "PUBLISHED" }, authRepo);
        expect(mailer_1.sendEmail).toHaveBeenCalledTimes(1);
        expect(mailer_1.sendEmail.mock.calls[0][0].to).toBe("user@test");
    });
    it("skips publish when no email", async () => {
        await (0, service_1.notifyEventPublished)({ ...baseEvent, createdByUserId: null, contactEmail: undefined, status: "PUBLISHED" }, authRepo);
        expect(mailer_1.sendEmail).not.toHaveBeenCalled();
    });
    it("falls back to contact email on reject", async () => {
        await (0, service_1.notifyEventRejected)({ ...baseEvent, createdByUserId: null, contactEmail: "contact@test", rejectionReason: "Motif" }, authRepo);
        expect(mailer_1.sendEmail).toHaveBeenCalledTimes(1);
        expect(mailer_1.sendEmail.mock.calls[0][0].to).toBe("contact@test");
    });
    it("skips delete notification when no email", async () => {
        await (0, service_1.notifyEventDeleted)({ ...baseEvent, createdByUserId: null, contactEmail: undefined }, authRepo);
        expect(mailer_1.sendEmail).not.toHaveBeenCalled();
    });
    it("notifies on delete when contact email exists", async () => {
        await (0, service_1.notifyEventDeleted)({ ...baseEvent, createdByUserId: null, contactEmail: "contact@test" }, authRepo);
        expect(mailer_1.sendEmail).toHaveBeenCalledTimes(1);
    });
});
