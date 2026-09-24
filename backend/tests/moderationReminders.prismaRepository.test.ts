jest.mock("@prisma/client", () => {
  const moderationReminderFindUnique = jest.fn();
  const moderationReminderUpsert = jest.fn();

  return {
    PrismaClient: jest.fn(() => ({
      moderationReminder: {
        findUnique: moderationReminderFindUnique,
        upsert: moderationReminderUpsert
      }
    })),
    __mocks: {
      moderationReminderFindUnique,
      moderationReminderUpsert
    }
  };
});

import { createPrismaModerationReminderRepository } from "../src/moderationReminders/prismaRepository";

const prismaMocks = jest.requireMock("@prisma/client").__mocks as {
  moderationReminderFindUnique: jest.Mock;
  moderationReminderUpsert: jest.Mock;
};

describe("createPrismaModerationReminderRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports false when no reminder row exists", async () => {
    prismaMocks.moderationReminderFindUnique.mockResolvedValue(null);
    const repo = createPrismaModerationReminderRepository();

    await expect(repo.hasBeenSent("event-1", "EVENT")).resolves.toBe(false);
    expect(prismaMocks.moderationReminderFindUnique).toHaveBeenCalledWith({
      where: { eventId_target: { eventId: "event-1", target: "EVENT" } }
    });
  });

  it("reports true when a reminder row exists", async () => {
    prismaMocks.moderationReminderFindUnique.mockResolvedValue({ id: "1" });
    const repo = createPrismaModerationReminderRepository();

    await expect(repo.hasBeenSent("event-1", "EVENT")).resolves.toBe(true);
  });

  it("upserts the reminder row when marking as sent", async () => {
    const repo = createPrismaModerationReminderRepository();

    await repo.markSent("event-1", "REVISION", "2026-01-01T00:00:00.000Z");

    expect(prismaMocks.moderationReminderUpsert).toHaveBeenCalledWith({
      where: { eventId_target: { eventId: "event-1", target: "REVISION" } },
      create: { eventId: "event-1", target: "REVISION", sentAt: new Date("2026-01-01T00:00:00.000Z") },
      update: { sentAt: new Date("2026-01-01T00:00:00.000Z") }
    });
  });
});
