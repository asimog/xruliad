import { fail, ok } from '@/lib/http';
import { listPublicFeed } from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const items = await listPublicFeed();
    return ok({ items }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load feed.');
  }
}
