jest.mock("../src/notifications/mailer", () => ({
  sendEmail: jest.fn(async () => ({ ok: true }))
}));

import { sendEmail } from "../src/notifications/mailer";
import {
  notifyEventDeleted,
  notifyEventPublished,
  notifyEventRejected,
  notifyEventResubmitted,
  notifyEventSubmitted
} from "../src/notifications/service";
import { AuthRepository } from "../src/auth/repository";
import { Event } from "../src/events/types";

const baseEvent: Event = {
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
  const authRepo: AuthRepository = {
    getUserByEmail: async () => null,
    getUserById: async (id) =>
      id === "user-1"
        ? { id: "user-1", name: "User", email: "user@test", role: "EDITOR", passwordHash: "hash" }
        : null,
    listUsersByRole: async () => [
      { id: "m1", name: "Mod", email: "mod@test", role: "MODERATOR", passwordHash: "hash" },
      { id: "a1", name: "Admin", email: "admin@test", role: "ADMIN", passwordHash: "hash" }
    ]
  };

  beforeEach(() => {
    (sendEmail as jest.Mock).mockClear();
    (sendEmail as jest.Mock).mockResolvedValue({ ok: true });
  });

  it("notifies moderators on submit", async () => {
    await notifyEventSubmitted(baseEvent, authRepo);

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("notifies moderators on resubmission", async () => {
    await notifyEventResubmitted({ ...baseEvent, status: "PENDING" }, authRepo);

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("skips submit when no moderators", async () => {
    const emptyRepo: AuthRepository = {
      getUserByEmail: async () => null,
      getUserById: async () => null,
      listUsersByRole: async () => []
    };

    await notifyEventSubmitted(baseEvent, emptyRepo);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns errors when notification fails", async () => {
    (sendEmail as jest.Mock).mockResolvedValueOnce({ ok: false, errors: ["boom"] });
    const result = await notifyEventSubmitted(baseEvent, authRepo);

    expect(result.ok).toBe(false);
  });

  it("notifies creator on publish", async () => {
    await notifyEventPublished({ ...baseEvent, status: "PUBLISHED" }, authRepo);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((sendEmail as jest.Mock).mock.calls[0][0].to).toBe("user@test");
  });

  it("skips publish when no email", async () => {
    await notifyEventPublished(
      { ...baseEvent, createdByUserId: null, contactEmail: undefined, status: "PUBLISHED" },
      authRepo
    );

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("falls back to contact email on reject", async () => {
    await notifyEventRejected(
      { ...baseEvent, createdByUserId: null, contactEmail: "contact@test", rejectionReason: "Motif" },
      authRepo
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((sendEmail as jest.Mock).mock.calls[0][0].to).toBe("contact@test");
  });

  it("skips delete notification when no email", async () => {
    await notifyEventDeleted({ ...baseEvent, createdByUserId: null, contactEmail: undefined }, authRepo);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("notifies on delete when contact email exists", async () => {
    await notifyEventDeleted({ ...baseEvent, createdByUserId: null, contactEmail: "contact@test" }, authRepo);

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
