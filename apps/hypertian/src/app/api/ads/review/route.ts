import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { getUserByPrivyId, reviewBannerAd } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  adId: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);
    if (!user) {
      return fail('User must be synced before reviewing ads.', 403);
    }

    const body = schema.parse(await request.json());
    const ad = await reviewBannerAd({
      adId: body.adId,
      streamerId: user.id,
      decision: body.decision,
    });

    return ok({ ad });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to review ad.', 400);
  }
}
