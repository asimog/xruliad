import { z } from 'zod';
import { fail, ok } from '@/lib/http';
import { DEFAULT_AD_PRICE_SOL, DEFAULT_CHART_TOKEN_ADDRESS } from '@/lib/constants';
import { getSiteUrl } from '@/lib/env';
import { createOverlayHeartbeatKey } from '@/lib/overlay-auth';
import { generateOwnerSession, getOwnerSessionFromCookie, setOwnerSessionCookie } from '@/lib/owner-session';
import { assertHttpsUrl, assertSolanaWallet, sanitizeOptionalHttpsUrl, streamPlatformSchema } from '@/lib/platform';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAnonymousStream, listOwnerPendingBannerAds, listStreamsByOwnerSession } from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';

const schema = z.object({
  platform: streamPlatformSchema,
  displayName: z.string().min(1).max(80),
  profileUrl: z.string().min(1),
  streamUrl: z.string().min(1),
  payoutWallet: z.string().optional().nullable(),
  priceSol: z.number().positive().max(100).optional(),
  defaultBannerUrl: z.string().optional().nullable(),
  defaultChartTokenAddress: z.string().optional().nullable(),
  pumpMint: z.string().optional().nullable(),
  pumpDeployerWallet: z.string().optional().nullable(),
});

function overlayUrlFor(streamId: string) {
  return `${getSiteUrl()}/overlay/${streamId}?key=${createOverlayHeartbeatKey(streamId)}`;
}

export async function GET() {
  try {
    const session = await getOwnerSessionFromCookie();
    if (!session) {
      return ok({ ownerSession: null, streams: [] });
    }
    const [streams, pendingAds] = await Promise.all([
      listStreamsByOwnerSession(session),
      listOwnerPendingBannerAds(session),
    ]);
    return ok({
      ownerSession: session,
      streams: streams.map((stream) => ({
        ...stream,
        overlayUrl: overlayUrlFor(stream.id),
      })),
      pendingAds,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load streams.');
  }
}

export async function POST(request: Request) {
  try {
    const currentSession = await getOwnerSessionFromCookie();
    const rateLimit = await checkRateLimit(
      request,
      { bucket: 'public_stream_create', maxAttempts: 5, windowSeconds: 60 * 60 },
      currentSession,
    );
    if (!rateLimit.allowed) {
      return fail('Too many stream profiles created. Please try again later.', 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const body = schema.parse(await request.json());
    const profileUrl = assertHttpsUrl(body.profileUrl, 'Profile URL');
    const streamUrl = assertHttpsUrl(body.streamUrl, 'Stream URL');
    const defaultBannerUrl = sanitizeOptionalHttpsUrl(body.defaultBannerUrl, 'Default banner URL');
    const pumpMint = body.pumpMint?.trim() || null;
    if (body.platform === 'pump' && !pumpMint) {
      return fail('Pump token mint is required so the default chart can use the streamer chart.', 400);
    }
    const defaultChartTokenAddress =
      body.platform === 'pump' ? pumpMint : body.defaultChartTokenAddress?.trim() || DEFAULT_CHART_TOKEN_ADDRESS;
    const payoutWallet =
      body.platform === 'pump'
        ? assertSolanaWallet(body.pumpDeployerWallet ?? '', 'Pump deployer wallet')
        : assertSolanaWallet(body.payoutWallet ?? '', 'Payout wallet');

    let session = currentSession;
    if (!session) {
      session = generateOwnerSession();
      await setOwnerSessionCookie(session);
    }

    const stream = await createAnonymousStream({
      ownerSession: session,
      platform: body.platform,
      displayName: body.displayName,
      profileUrl,
      streamUrl,
      payoutWallet,
      priceSol: body.priceSol ?? DEFAULT_AD_PRICE_SOL,
      defaultBannerUrl,
      defaultChartTokenAddress,
      pumpMint: body.platform === 'pump' ? pumpMint : null,
      pumpDeployerWallet: body.platform === 'pump' ? payoutWallet : null,
    });

    return ok({
      stream,
      ownerSession: session,
      overlayUrl: overlayUrlFor(stream.id),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create stream.', 400);
  }
}
