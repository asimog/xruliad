import { db, Prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export interface RateLimitRule {
  windowSec: number;
  limit: number;
  name: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  exceededRule?: string;
}

interface InMemoryRateLimitCounter {
  count: number;
  windowEndSec: number;
}

const inMemoryRateLimitStore = new Map<string, InMemoryRateLimitCounter>();

// Periodic cleanup of expired in-memory rate limit entries (every 5 minutes)
const MEMORY_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_IN_MEMORY_ENTRIES = 10_000; // Hard cap to prevent memory exhaustion

const cleanupTimer = setInterval(() => {
  const nowSec = Math.floor(Date.now() / 1000);
  let cleaned = 0;
  for (const [id, counter] of inMemoryRateLimitStore.entries()) {
    if (counter.windowEndSec <= nowSec) {
      inMemoryRateLimitStore.delete(id);
      cleaned++;
    }
  }
  // If still over limit, aggressively clean oldest entries
  if (inMemoryRateLimitStore.size > MAX_IN_MEMORY_ENTRIES) {
    const excess = inMemoryRateLimitStore.size - MAX_IN_MEMORY_ENTRIES;
    const keysToDelete = Array.from(inMemoryRateLimitStore.keys()).slice(
      0,
      excess,
    );
    for (const key of keysToDelete) {
      inMemoryRateLimitStore.delete(key);
    }
  }
}, MEMORY_CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

function encodeKey(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function bucketStart(nowSec: number, windowSec: number): number {
  return Math.floor(nowSec / windowSec) * windowSec;
}

function enforceRateLimitInMemory(input: {
  scope: string;
  key: string;
  rules: RateLimitRule[];
  now?: Date;
}): RateLimitResult {
  const now = input.now ?? new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const encodedKey = encodeKey(`${input.scope}:${input.key}`);

  const ruleEntries = input.rules.map((rule) => {
    const start = bucketStart(nowSec, rule.windowSec);
    const id = `${input.scope}:${rule.name}:${rule.windowSec}:${start}:${encodedKey}`;
    return {
      id,
      rule,
      windowEndSec: start + rule.windowSec,
    };
  });

  let retryAfterSec = 0;
  let exceededRule: string | undefined;
  for (const entry of ruleEntries) {
    const existing = inMemoryRateLimitStore.get(entry.id);
    const nextCounter =
      !existing || existing.windowEndSec <= nowSec
        ? {
            count: 1,
            windowEndSec: entry.windowEndSec,
          }
        : {
            count: existing.count + 1,
            windowEndSec: existing.windowEndSec,
          };

    inMemoryRateLimitStore.set(entry.id, nextCounter);
    if (nextCounter.count > entry.rule.limit) {
      const remaining = Math.max(1, entry.windowEndSec - nowSec);
      retryAfterSec = Math.max(retryAfterSec, remaining);
      exceededRule = entry.rule.name;
    }
  }

  if (retryAfterSec > 0) {
    return { allowed: false, retryAfterSec, exceededRule };
  }

  return { allowed: true, retryAfterSec: 0 };
}

export async function enforceRateLimit(input: {
  scope: string;
  key: string;
  rules: RateLimitRule[];
  now?: Date;
}): Promise<RateLimitResult> {
  if (getEnv().LIMITS_MODE === "off") {
    return { allowed: true, retryAfterSec: 0 };
  }

  // Fallback to in-memory counters when DB is unavailable.
  if (!db) {
    return enforceRateLimitInMemory(input);
  }

  try {
    return await _enforceRateLimitWithDb(input);
  } catch {
    // DB error — degrade to process-local limiter instead of fail-open.
    return enforceRateLimitInMemory(input);
  }
}

async function _enforceRateLimitWithDb(input: {
  scope: string;
  key: string;
  rules: RateLimitRule[];
  now?: Date;
}): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const encodedKey = encodeKey(`${input.scope}:${input.key}`);

  const ruleEntries = input.rules.map((rule) => {
    const start = bucketStart(nowSec, rule.windowSec);
    const id = `${input.scope}:${rule.name}:${rule.windowSec}:${start}:${encodedKey}`;
    return { rule, start, id };
  });

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    let retryAfterSec = 0;
    let exceededRule: string | undefined;
    for (let index = 0; index < ruleEntries.length; index += 1) {
      const entry = ruleEntries[index]!;
      const expiresAt = new Date((entry.start + entry.rule.windowSec) * 1000);
      const counter = await tx.rateLimit.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          count: 1,
          windowEnd: expiresAt,
          updatedAt: now,
        },
        update: {
          count: { increment: 1 },
          updatedAt: now,
        },
      });

      if (counter.count > entry.rule.limit) {
        const remaining = entry.start + entry.rule.windowSec - nowSec;
        retryAfterSec = Math.max(retryAfterSec, Math.max(1, remaining));
        exceededRule = entry.rule.name;
      }
    }

    if (retryAfterSec > 0) {
      return {
        allowed: false,
        retryAfterSec,
        exceededRule,
      };
    }

    return {
      allowed: true,
      retryAfterSec: 0,
    };
  });
}
