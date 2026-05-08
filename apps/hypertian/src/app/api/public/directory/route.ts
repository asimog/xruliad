import { fail, ok } from '@/lib/http';
import { listLiveDirectoryStreams } from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const streams = await listLiveDirectoryStreams();
    return ok({ streams }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load directory.');
  }
}
