import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/http';
import { getStreamHeartbeatStatus } from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const streamId = request.nextUrl.searchParams.get('streamId');
  if (!streamId) {
    return fail('streamId is required.', 400);
  }

  try {
    const status = await getStreamHeartbeatStatus(streamId);
    if (!status) {
      return fail('Stream not found.', 404);
    }
    return ok(status, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load heartbeat status.');
  }
}
