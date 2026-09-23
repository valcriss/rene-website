import { AdminRepository } from "../admin/repository";
import { notifyContactMessage } from "../notifications/service";
import { RateLimiter } from "./rateLimiter";
import { validateContactMessage } from "./validation";

export type ContactResult =
  | { ok: true; value: { message: string } }
  | { ok: false; errors: string[]; code: "validation" | "rate_limited" | "notification" };

const successResult: ContactResult = { ok: true, value: { message: "Votre message a bien été envoyé." } };

export const submitContactMessage = async (
  adminRepo: AdminRepository,
  input: unknown,
  limiter: RateLimiter,
  clientKey: string
): Promise<ContactResult> => {
  const validation = validateContactMessage(input);
  if (!validation.ok) {
    return { ok: false, code: "validation", errors: validation.errors };
  }

  // Bots that fill the hidden honeypot field are silently dropped: report success so
  // they have no signal telling them the field was a trap.
  if (validation.value.honeypot) {
    return successResult;
  }

  if (!limiter.isAllowed(clientKey)) {
    return {
      ok: false,
      code: "rate_limited",
      errors: ["Trop de messages envoyés. Merci de réessayer plus tard."]
    };
  }

  const settings = await adminRepo.getSettings();
  const notification = await notifyContactMessage(settings.contactEmail, {
    name: validation.value.name,
    email: validation.value.email,
    message: validation.value.message
  });

  if (!notification.ok) {
    return { ok: false, code: "notification", errors: notification.errors };
  }

  return successResult;
};
