import { AuthRepository } from "../auth/repository";
import { EventRepository } from "../events/repository";
import { Event } from "../events/types";
import { notifyModerationReminder } from "../notifications/service";
import { ModerationReminderRepository, ReminderTarget } from "./repository";

const REMINDER_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

type PendingItem = {
  eventId: string;
  target: ReminderTarget;
  createdAt: string;
  event: Event;
};

const collectPendingItems = (events: Event[]): PendingItem[] => {
  const items: PendingItem[] = [];

  for (const event of events) {
    if (event.status === "PENDING") {
      items.push({ eventId: event.id, target: "EVENT", createdAt: event.createdAt, event });
    } else if (event.pendingRevision?.status === "PENDING") {
      items.push({ eventId: event.id, target: "REVISION", createdAt: event.pendingRevision.createdAt, event });
    }
  }

  return items;
};

const isOverdue = (createdAt: string, now: Date) => now.getTime() - new Date(createdAt).getTime() >= REMINDER_THRESHOLD_MS;

export const runModerationReminderCheck = async (
  eventRepo: EventRepository,
  reminderRepo: ModerationReminderRepository,
  authRepo: AuthRepository,
  now: Date = new Date()
): Promise<{ remindersSent: number }> => {
  const events = await eventRepo.list();
  const overdueItems = collectPendingItems(events).filter((item) => isOverdue(item.createdAt, now));

  let remindersSent = 0;

  for (const item of overdueItems) {
    const alreadySent = await reminderRepo.hasBeenSent(item.eventId, item.target);
    if (alreadySent) {
      continue;
    }

    await notifyModerationReminder(item.event, authRepo);
    await reminderRepo.markSent(item.eventId, item.target, now.toISOString());
    remindersSent += 1;
  }

  return { remindersSent };
};
