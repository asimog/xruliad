import { fail, ok } from '@/lib/http';
import { createOverlayHeartbeatKey } from '@/lib/overlay-auth';
import { requirePrivyUser } from '@/lib/privy';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/env';
import { getUserByPrivyId, listAdsForStreamer, sortStreamsByBookingPriority } from '@/lib/supabase/queries';
import { StreamRecord } from '@/lib/types';

export async function GET() {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);

    if (!user) {
      return fail('User must be synced before loading dashboard data.', 403);
    }

    const supabase = createAdminClient();
    const [streamsRes, ads] = await Promise.all([
      supabase.from('streams').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      listAdsForStreamer(user.id),
    ]);

    if (streamsRes.error) {
      throw streamsRes.error;
    }

    const baseUrl = getSiteUrl();
    const streams = sortStreamsByBookingPriority((streamsRes.data ?? []) as StreamRecord[]).map((stream) => ({
      ...stream,
      overlayUrl: `${baseUrl}/overlay/${stream.id}?key=${createOverlayHeartbeatKey(stream.id)}`,
    }));

    return ok({
      streams,
      ads,
      mediaJobs: [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load streamer dashboard.', 400);
  }
}
