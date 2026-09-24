jest.mock("../src/notifications/service", () => ({
  notifyModerationReminder: jest.fn(async () => ({ ok: true }))
}));

import { notifyModerationReminder } from "../src/notifications/service";
import { runModerationReminderCheck } from "../src/moderationReminders/service";
import { EventRepository } from "../src/events/repository";
import { ModerationReminderRepository } from "../src/moderationReminders/repository";
import { Event } from "../src/events/types";

const notifyModerationReminderMock = notifyModerationReminder as jest.Mock;

const now = new Date("2026-01-10T00:00:00.000Z");
const fourDaysAgo = "2026-01-06T00:00:00.000Z";
const oneDayAgo = "2026-01-09T00:00:00.000Z";

const baseEvent: Event = {
  id: "event-1",
  title: "Concert",
  content: null,
  image: null,
  createdByUserId: null,
  categoryId: "music",
  audienceId: null,
  occurrences: [],
  organizerName: null,
  featured: false,
  status: "DRAFT",
  publishedAt: null,
  publicationEndAt: "2026-02-01T00:00:00.000Z",
  rejectionReason: null,
  archivedAt: null,
  pendingRevision: null,
  createdAt: fourDaysAgo,
  updatedAt: fourDaysAgo
};

const buildRepo = (events: Event[]): EventRepository =>
  ({
    list: async () => events
  }) as unknown as EventRepository;

const buildReminderRepo = (alreadySent: Set<string> = new Set()): ModerationReminderRepository => ({
  hasBeenSent: jest.fn(async (eventId, target) => alreadySent.has(`${eventId}:${target}`)),
  markSent: jest.fn(async () => undefined)
});

const authRepo = {} as never;

describe("runModerationReminderCheck", () => {
  beforeEach(() => {
    notifyModerationReminderMock.mockClear();
  });

  it("sends a reminder for a pending event older than 3 days", async () => {
    const events = [{ ...baseEvent, status: "PENDING" as const }];
    const reminderRepo = buildReminderRepo();

    const result = await runModerationReminderCheck(buildRepo(events), reminderRepo, authRepo, now);

    expect(result.remindersSent).toBe(1);
    expect(notifyModerationReminderMock).toHaveBeenCalledWith(events[0], authRepo);
    expect(reminderRepo.markSent).toHaveBeenCalledWith("event-1", "EVENT", now.toISOString());
  });

  it("defaults to the current time when none is provided", async () => {
    const events = [{ ...baseEvent, status: "PENDING" as const, createdAt: new Date().toISOString() }];
    const reminderRepo = buildReminderRepo();

    const result = await runModerationReminderCheck(buildRepo(events), reminderRepo, authRepo);

    expect(result.remindersSent).toBe(0);
    expect(notifyModerationReminderMock).not.toHaveBeenCalled();
  });

  it("does not send a reminder for a pending event younger than 3 days", async () => {
    const events = [{ ...baseEvent, status: "PENDING" as const, createdAt: oneDayAgo }];
    const reminderRepo = buildReminderRepo();

    const result = await runModerationReminderCheck(buildRepo(events), reminderRepo, authRepo, now);

    expect(result.remindersSent).toBe(0);
    expect(notifyModerationReminderMock).not.toHaveBeenCalled();
  });

  it("does not resend a reminder that was already sent", async () => {
    const events = [{ ...baseEvent, status: "PENDING" as const }];
    const reminderRepo = buildReminderRepo(new Set(["event-1:EVENT"]));

    const result = await runModerationReminderCheck(buildRepo(events), reminderRepo, authRepo, now);

    expect(result.remindersSent).toBe(0);
    expect(notifyModerationReminderMock).not.toHaveBeenCalled();
  });

  it("sends a reminder for a pending revision of a published event older than 3 days", async () => {
    const events = [
      {
        ...baseEvent,
        status: "PUBLISHED" as const,
        pendingRevision: {
          id: "rev-1",
          eventId: "event-1",
          title: "Concert modifié",
          content: null,
          image: null,
          createdByUserId: null,
          categoryId: "music",
          audienceId: null,
          occurrences: [],
          organizerName: null,
          status: "PENDING" as const,
          featured: false,
          rejectionReason: null,
          createdAt: fourDaysAgo,
          updatedAt: fourDaysAgo
        }
      }
    ];
    const reminderRepo = buildReminderRepo();

    const result = await runModerationReminderCheck(buildRepo(events), reminderRepo, authRepo, now);

    expect(result.remindersSent).toBe(1);
    expect(reminderRepo.markSent).toHaveBeenCalledWith("event-1", "REVISION", now.toISOString());
  });

  it("ignores draft, published without a pending revision, and rejected events", async () => {
    const events = [
      { ...baseEvent, id: "e1", status: "DRAFT" as const },
      { ...baseEvent, id: "e2", status: "PUBLISHED" as const, pendingRevision: null },
      { ...baseEvent, id: "e3", status: "REJECTED" as const }
    ];
    const reminderRepo = buildReminderRepo();

    const result = await runModerationReminderCheck(buildRepo(events), reminderRepo, authRepo, now);

    expect(result.remindersSent).toBe(0);
    expect(notifyModerationReminderMock).not.toHaveBeenCalled();
  });
});
