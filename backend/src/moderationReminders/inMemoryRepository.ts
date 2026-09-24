import { ModerationReminderRepository, ReminderTarget } from "./repository";

const key = (eventId: string, target: ReminderTarget) => `${eventId}:${target}`;

export const createInMemoryModerationReminderRepository = (): ModerationReminderRepository => {
  const sent = new Set<string>();

  return {
    hasBeenSent: async (eventId, target) => sent.has(key(eventId, target)),
    markSent: async (eventId, target) => {
      sent.add(key(eventId, target));
    }
  };
};
