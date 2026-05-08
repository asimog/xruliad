import { z } from 'zod';
import { fail, ok } from '@/lib/http';
import { getBannerReviewState } from '@/lib/ad-state';
import { getOwnerSessionFromCookie } from '@/lib/owner-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOwnerAd } from '@/lib/supabase/anon-queries';
import { AdRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  adId: z.string().min(8),
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(request: Request) {
  try {
    const session = await getOwnerSessionFromCookie();
    if (!session) {
      return fail('Owner session missing.', 401);
    }

    const body = schema.parse(await request.json());
    const ad = await getOwnerAd(body.adId, session);
    if (!ad) {
      return fail('Ad not found for this session.', 404);
    }
    if (ad.ad_type !== 'banner') {
      return fail('Only banner ads require streamer approval.', 400);
    }
    if (ad.status !== 'pending_streamer_approval') {
      return fail('Banner ad must be paid before streamer approval.', 400);
    }

    const review = getBannerReviewState({
      decision: body.decision,
      durationMinutes: ad.duration_minutes,
      existingExpiresAt: ad.expires_at,
    });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ads')
      .update({
        status: review.status,
        is_active: review.isActive,
        starts_at: review.startsAt,
        expires_at: review.expiresAt,
      })
      .eq('id', body.adId)
      .select()
      .single<AdRecord>();

    if (error) {
      throw error;
    }

    return ok({ ad: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to review ad.', 400);
  }
}
