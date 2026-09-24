export type ReminderTarget = "EVENT" | "REVISION";

export interface ModerationReminderRepository {
  hasBeenSent(eventId: string, target: ReminderTarget): Promise<boolean>;
  markSent(eventId: string, target: ReminderTarget, sentAt: string): Promise<void>;
}
