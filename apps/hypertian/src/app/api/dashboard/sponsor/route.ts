import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserByPrivyId, sortStreamsByBookingPriority } from '@/lib/supabase/queries';
import { StreamRecord } from '@/lib/types';

export async function GET() {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);

    if (!user) {
      return fail('User must be synced before loading dashboard data.', 403);
    }

    const supabase = createAdminClient();
    const [streamsRes, adsRes] = await Promise.all([
      supabase.from('streams').select('id, user_id, platform, last_heartbeat, created_at').order('created_at', { ascending: false }),
      supabase.from('ads').select('*').eq('sponsor_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]);

    if (streamsRes.error) {
      throw streamsRes.error;
    }
    if (adsRes.error) {
      throw adsRes.error;
    }

    return ok({
      streams: sortStreamsByBookingPriority((streamsRes.data ?? []) as StreamRecord[]),
      ads: adsRes.data ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load sponsor dashboard.', 400);
  }
}
