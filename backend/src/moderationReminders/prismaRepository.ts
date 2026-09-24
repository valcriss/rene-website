import { prisma } from "../prisma/client";
import { ModerationReminderRepository } from "./repository";

export const createPrismaModerationReminderRepository = (): ModerationReminderRepository => ({
  hasBeenSent: async (eventId, target) => {
    const existing = await prisma.moderationReminder.findUnique({
      where: { eventId_target: { eventId, target } }
    });
    return existing !== null;
  },
  markSent: async (eventId, target, sentAt) => {
    await prisma.moderationReminder.upsert({
      where: { eventId_target: { eventId, target } },
      create: { eventId, target, sentAt: new Date(sentAt) },
      update: { sentAt: new Date(sentAt) }
    });
  }
});
