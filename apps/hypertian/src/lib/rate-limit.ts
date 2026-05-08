import 'server-only';
import { createHash } from 'node:crypto';
import { isSupabaseAdminEnabled } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

type RateLimitRule = {
  bucket: string;
  maxAttempts: number;
  windowSeconds: number;
};

type MemoryCounter = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const memoryCounters = new Map<string, MemoryCounter>();

function getHeader(request: Request, name: string) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase()) || '';
}

function getClientAddress(request: Request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for').split(',')[0]?.trim();
  return (
    forwardedFor ||
    getHeader(request, 'x-real-ip') ||
    getHeader(request, 'cf-connecting-ip') ||
    getHeader(request, 'x-vercel-forwarded-for').split(',')[0]?.trim() ||
    'unknown'
  );
}

function hashClientKey(request: Request, bucket: string, subject?: string | null) {
  const userAgent = getHeader(request, 'user-agent').slice(0, 180);
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SITE_URL || 'hypertian';
  const rawKey = [bucket, subject || 'anonymous', getClientAddress(request), userAgent].join('|');
  return createHash('sha256').update(`${salt}:${rawKey}`).digest('hex');
}

function memoryRateLimit(rule: RateLimitRule, keyHash: string, now = Date.now()): RateLimitResult {
  const counterKey = `${rule.bucket}:${keyHash}`;
  const current = memoryCounters.get(counterKey);
  if (!current || current.resetAt <= now) {
    memoryCounters.set(counterKey, {
      count: 1,
      resetAt: now + rule.windowSeconds * 1000,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count <= rule.maxAttempts) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export async function checkRateLimit(request: Request, rule: RateLimitRule, subject?: string | null): Promise<RateLimitResult> {
  const keyHash = hashClientKey(request, rule.bucket, subject);

  if (isSupabaseAdminEnabled()) {
    try {
      const { data, error } = await createAdminClient().rpc('check_write_rate_limit', {
        p_bucket: rule.bucket,
        p_key_hash: keyHash,
        p_max_attempts: rule.maxAttempts,
        p_window_seconds: rule.windowSeconds,
      });

      if (!error && typeof data === 'boolean') {
        return {
          allowed: data,
          retryAfterSeconds: data ? 0 : rule.windowSeconds,
        };
      }

      console.warn('Supabase rate limit check fell back to memory.', error);
    } catch (error) {
      console.warn('Supabase rate limit check failed; using memory fallback.', error);
    }
  }

  return memoryRateLimit(rule, keyHash);
}

export function resetMemoryRateLimitsForTests() {
  memoryCounters.clear();
}
