import { z } from 'zod';
import { fail, ok } from '@/lib/http';
import { getOwnerSessionFromCookie } from '@/lib/owner-session';
import { sanitizeOptionalHttpsUrl } from '@/lib/platform';
import { getStreamForOwner, updateOwnerStreamBanner } from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';

const schema = z.object({
  streamId: z.string().min(8),
  bannerUrl: z.string().url().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getOwnerSessionFromCookie();
    if (!session) {
      return fail('Owner session missing — create a profile first.', 401);
    }

    const body = schema.parse(await request.json());
    const stream = await getStreamForOwner(body.streamId, session);
    if (!stream) {
      return fail('Stream not found for this session.', 404);
    }

    const sanitized = body.bannerUrl ? sanitizeOptionalHttpsUrl(body.bannerUrl, 'Banner URL') : null;
    const updated = await updateOwnerStreamBanner(body.streamId, session, sanitized);
    return ok({ stream: updated });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to update banner.', 400);
  }
}
