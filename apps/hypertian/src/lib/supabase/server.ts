import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicEnv, getSupabasePublishableKey } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();
  const publishableKey = getSupabasePublishableKey(env);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    throw new Error('Supabase public environment variables are not configured.');
  }

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(entries: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
        for (const entry of entries) {
          cookieStore.set(entry.name, entry.value, entry.options);
        }
      },
    },
  });
}
