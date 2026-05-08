import { fail, ok } from '@/lib/http';
import { STREAM_LIVE_CLEANUP_THRESHOLD_MS } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return fail('Unauthorized.', 401);
    }

    const supabase = createAdminClient();
    const staleBefore = new Date(Date.now() - STREAM_LIVE_CLEANUP_THRESHOLD_MS).toISOString();

    // Clean up stale heartbeat records (no longer needed with is_live removal)
    // This endpoint is kept for backward compatibility but no longer modifies is_live
    const { data: updatedStreams, error } = await supabase
      .from('streams')
      .select('id')
      .lt('last_heartbeat', staleBefore)
      .select('id');

    if (error) {
      throw error;
    }

    return ok({
      status: 'ok',
      streamsStale: updatedStreams?.length ?? 0,
      note: 'is_live field has been removed; liveness is now calculated from last_heartbeat',
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to clean up streams.', 500);
  }
}