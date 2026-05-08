import { z } from 'zod';
import { fail, ok } from '@/lib/http';
import { isAdminAuthenticated } from '@/lib/admin-session';
import {
  adminTriggerHeartbeat,
  setAdHidden,
  setFeedbackStatus,
  setStreamHidden,
} from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('hide-ad'), adId: z.string().min(8), hidden: z.boolean() }),
  z.object({ action: z.literal('hide-stream'), streamId: z.string().min(8), hidden: z.boolean() }),
  z.object({ action: z.literal('trigger-heartbeat'), streamId: z.string().min(8) }),
  z.object({ action: z.literal('resolve-feedback'), id: z.string().min(8), status: z.enum(['open', 'resolved']) }),
]);

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return fail('Unauthorized.', 401);
  }

  try {
    const body = schema.parse(await request.json());
    switch (body.action) {
      case 'hide-ad': {
        const ad = await setAdHidden(body.adId, body.hidden);
        return ok({ ad });
      }
      case 'hide-stream': {
        const stream = await setStreamHidden(body.streamId, body.hidden);
        return ok({ stream });
      }
      case 'trigger-heartbeat': {
        const stream = await adminTriggerHeartbeat(body.streamId);
        return ok({ stream });
      }
      case 'resolve-feedback': {
        const feedback = await setFeedbackStatus(body.id, body.status);
        return ok({ feedback });
      }
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Action failed.', 400);
  }
}
