import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv, getSupabasePublishableKey } from '@/lib/env';

export function createClient() {
  const env = getPublicEnv();
  const publishableKey = getSupabasePublishableKey(env);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    throw new Error('Supabase public environment variables are not configured.');
  }

  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, publishableKey);
}
