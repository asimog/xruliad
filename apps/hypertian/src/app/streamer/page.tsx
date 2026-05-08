import { Metadata } from 'next';
import { getOwnerSessionFromCookie } from '@/lib/owner-session';
import { listOwnerPendingBannerAds, listStreamsByOwnerSession } from '@/lib/supabase/anon-queries';
import { getSiteUrl } from '@/lib/env';
import { createOverlayHeartbeatKey } from '@/lib/overlay-auth';
import { StreamerWorkspace } from '@/components/streamer-workspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Streamer',
  description: 'Create your X Broadcast or Pump stream profile, verify your overlay heartbeat, and approve banner requests.',
};

function overlayUrlFor(streamId: string) {
  return `${getSiteUrl()}/overlay/${streamId}?key=${createOverlayHeartbeatKey(streamId)}`;
}

export default async function StreamerPage() {
  const ownerSession = await getOwnerSessionFromCookie();
  const streams = ownerSession ? await listStreamsByOwnerSession(ownerSession) : [];
  const pendingAds = ownerSession ? await listOwnerPendingBannerAds(ownerSession) : [];

  const decoratedStreams = streams.map((stream) => ({
    ...stream,
    overlayUrl: overlayUrlFor(stream.id),
  }));

  return <StreamerWorkspace initialStreams={decoratedStreams} initialPendingAds={pendingAds} />;
}
