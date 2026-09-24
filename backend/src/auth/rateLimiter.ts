import { createHash } from "node:crypto";
import { AuthRepository } from "./repository";

type AuthAction = "login" | "signup" | "forgot-password" | "reset-password";

type Limit = { max: number; windowMs: number };

const limits: Record<AuthAction, { ip: Limit; account?: Limit }> = {
  login: {
    ip: { max: 20, windowMs: 15 * 60 * 1000 },
    account: { max: 5, windowMs: 15 * 60 * 1000 }
  },
  signup: { ip: { max: 3, windowMs: 60 * 60 * 1000 } },
  "forgot-password": {
    ip: { max: 5, windowMs: 15 * 60 * 1000 },
    account: { max: 3, windowMs: 15 * 60 * 1000 }
  },
  "reset-password": {
    ip: { max: 10, windowMs: 15 * 60 * 1000 },
    account: { max: 5, windowMs: 15 * 60 * 1000 }
  }
};

const identifierKey = (scope: "ip" | "account", action: AuthAction, identifier: string) =>
  `auth:${action}:${scope}:${createHash("sha256").update(identifier).digest("hex")}`;

export type AuthThrottleResult = { allowed: boolean; retryAfterSeconds: number };

export const checkAuthThrottle = async (
  repo: AuthRepository,
  action: AuthAction,
  ip: string,
  accountIdentifier?: string
): Promise<AuthThrottleResult> => {
  if (!repo.consumeRateLimit) return { allowed: true, retryAfterSeconds: 0 };

  const now = new Date();
  const policy = limits[action];
  const checks: Array<{ key: string; limit: Limit }> = [
    { key: identifierKey("ip", action, ip), limit: policy.ip }
  ];
  if (policy.account && accountIdentifier) {
    checks.push({ key: identifierKey("account", action, accountIdentifier), limit: policy.account });
  }

  for (const check of checks) {
    const result = await repo.consumeRateLimit({ ...check, now });
    if (!result.allowed) return result;
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

export const clearLoginThrottle = async (repo: AuthRepository, email: string) => {
  if (!repo.clearRateLimit) return;
  await repo.clearRateLimit(identifierKey("account", "login", email));
};
