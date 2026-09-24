import { createHash } from "node:crypto";
import { Request, Response } from "express";
import { AuthRepository } from "../auth/repository";
import { ConsumeRateLimitInput, ConsumeRateLimitResult } from "../auth/types";

export type RateLimit = { max: number; windowMs: number };

export type RequestRateLimitPolicy = {
  action: string;
  ip: RateLimit;
  actor?: RateLimit;
};

export const resolveClientKey = (req: Pick<Request, "ip">): string => req.ip ?? "unknown";

type Clock = () => Date;

const maximumFallbackKeys = 1_000;

const hashIdentifier = (value: string) => createHash("sha256").update(value).digest("hex");

const keyFor = (action: string, scope: "ip" | "actor", identifier: string) =>
  `abuse:${action}:${scope}:${hashIdentifier(identifier)}`;

const createBoundedFallbackStore = () => {
  const entries = new Map<string, { attempts: number; windowStartedAt: Date }>();

  const prune = (now: Date) => {
    for (const [key, entry] of entries) {
      if (now.getTime() - entry.windowStartedAt.getTime() >= 60 * 60 * 1000) entries.delete(key);
    }
    while (entries.size >= maximumFallbackKeys) entries.delete(entries.keys().next().value as string);
  };

  return async ({ key, limit, now }: ConsumeRateLimitInput): Promise<ConsumeRateLimitResult> => {
    prune(now);
    const current = entries.get(key);
    const elapsed = current ? now.getTime() - current.windowStartedAt.getTime() : Number.POSITIVE_INFINITY;
    const entry = !current || elapsed >= limit.windowMs
      ? { attempts: 0, windowStartedAt: now }
      : current;

    if (entry.attempts >= limit.max) {
      entries.delete(key);
      entries.set(key, entry);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((limit.windowMs - elapsed) / 1000))
      };
    }

    entry.attempts += 1;
    entries.delete(key);
    entries.set(key, entry);
    return { allowed: true, retryAfterSeconds: 0 };
  };
};

export const createRequestRateLimiter = (
  repository?: Pick<AuthRepository, "consumeRateLimit">,
  clock: Clock = () => new Date()
) => {
  const consume = repository?.consumeRateLimit ?? createBoundedFallbackStore();

  const check = async (
    policy: RequestRateLimitPolicy,
    ip: string,
    actorId?: string
  ): Promise<ConsumeRateLimitResult> => {
    const now = clock();
    const checks: Array<{ key: string; limit: RateLimit }> = [
      { key: keyFor(policy.action, "ip", ip), limit: policy.ip }
    ];
    if (policy.actor && actorId) checks.push({ key: keyFor(policy.action, "actor", actorId), limit: policy.actor });

    for (const item of checks) {
      const result = await consume({ ...item, now });
      if (!result.allowed) return result;
    }
    return { allowed: true, retryAfterSeconds: 0 };
  };

  return { check };
};

export const enforceRequestRateLimit = async (
  limiter: ReturnType<typeof createRequestRateLimiter>,
  req: Request,
  res: Response,
  policy: RequestRateLimitPolicy
) => {
  const result = await limiter.check(policy, resolveClientKey(req), req.user?.id);
  if (result.allowed) return true;

  res.set("Retry-After", String(result.retryAfterSeconds));
  // eslint-disable-next-line no-console
  console.warn("Rate limit reached", { action: policy.action, authenticated: Boolean(req.user) });
  res.status(429).json({ errors: ["Trop de requêtes. Réessayez plus tard."] });
  return false;
};
