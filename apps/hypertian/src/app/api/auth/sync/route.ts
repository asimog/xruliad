import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { upsertUser } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  walletAddress: z.string().nullable(),
  role: z.enum(['streamer', 'sponsor']),
});

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const body = schema.parse(await request.json());
    const user = await upsertUser({
      privyId: claims.user_id,
      walletAddress: body.walletAddress,
      role: body.role,
    });
    return ok({ user });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to sync user.', 400);
  }
}
