import { createInMemoryModerationReminderRepository } from "../src/moderationReminders/inMemoryRepository";

describe("createInMemoryModerationReminderRepository", () => {
  it("reports nothing sent by default", async () => {
    const repo = createInMemoryModerationReminderRepository();

    await expect(repo.hasBeenSent("event-1", "EVENT")).resolves.toBe(false);
  });

  it("remembers a reminder was sent for a given event and target", async () => {
    const repo = createInMemoryModerationReminderRepository();

    await repo.markSent("event-1", "EVENT", "2026-01-01T00:00:00.000Z");

    await expect(repo.hasBeenSent("event-1", "EVENT")).resolves.toBe(true);
    await expect(repo.hasBeenSent("event-1", "REVISION")).resolves.toBe(false);
  });
});
