import { fail, ok } from '@/lib/http';
import { verifyOverlayHeartbeatKey } from '@/lib/overlay-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { STREAM_HEARTBEAT_STALE_MS } from '@/lib/constants';
import { z } from 'zod';

const schema = z.object({
  streamId: z.string().uuid().or(z.string().min(8)),
  key: z.string().min(32),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (!verifyOverlayHeartbeatKey(body.streamId, body.key)) {
      return fail('Unauthorized.', 401);
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // First, get current stream state to check if overlay_verified_at needs to be set
    const { data: currentStream, error: fetchError } = await supabase
      .from('streams')
      .select('overlay_verified_at')
      .eq('id', body.streamId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Build update payload - only set overlay_verified_at if not already set
    const updatePayload: Record<string, unknown> = {
      last_heartbeat: now,
    };

    // Only set overlay_verified_at once (when it's null/undefined)
    if (!currentStream?.overlay_verified_at) {
      updatePayload.overlay_verified_at = now;
    }

    const { data, error } = await supabase
      .from('streams')
      .update(updatePayload)
      .eq('id', body.streamId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ok({ stream: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to record heartbeat.', 400);
  }
}
