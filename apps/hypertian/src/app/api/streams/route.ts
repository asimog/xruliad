import { fail, ok } from '@/lib/http';
import { createOverlayHeartbeatKey } from '@/lib/overlay-auth';
import { DEFAULT_AD_PRICE_SOL, DEFAULT_CHART_TOKEN_ADDRESS } from '@/lib/constants';
import { getSiteUrl } from '@/lib/env';
import { assertHttpsUrl, sanitizeOptionalHttpsUrl, streamPlatformSchema } from '@/lib/platform';
import { requirePrivyUser } from '@/lib/privy';
import { getPumpCreatorWallet } from '@/lib/pump';
import { createStream, getUserByPrivyId, listPublicStreams } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  platform: streamPlatformSchema,
  displayName: z.string().min(1).max(80),
  profileUrl: z.string().min(1),
  streamUrl: z.string().min(1),
  payoutWallet: z.string().min(32),
  priceSol: z.number().positive().max(100).default(DEFAULT_AD_PRICE_SOL),
  defaultBannerUrl: z.string().optional().nullable(),
  defaultChartTokenAddress: z.string().optional().nullable(),
  pumpMint: z.string().optional().nullable(),
  pumpDeployerWallet: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const streams = await listPublicStreams();
    return ok({ streams });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load streams.');
  }
}

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const body = schema.parse(await request.json());
    const user = await getUserByPrivyId(claims.user_id);
    if (!user) {
      return fail('User must be synced before creating a stream.', 403);
    }

    const profileUrl = assertHttpsUrl(body.profileUrl, 'Profile URL');
    const streamUrl = assertHttpsUrl(body.streamUrl, 'Stream URL');
    const defaultBannerUrl = sanitizeOptionalHttpsUrl(body.defaultBannerUrl, 'Default banner URL');
    const pumpMint = body.pumpMint?.trim() || null;
    if (body.platform === 'pump' && !pumpMint) {
      return fail('Pump token mint is required so the default chart can use the streamer chart.', 400);
    }
    const defaultChartTokenAddress =
      body.platform === 'pump' ? pumpMint : body.defaultChartTokenAddress?.trim() || DEFAULT_CHART_TOKEN_ADDRESS;
    let pumpDeployerWallet = body.platform === 'pump' ? body.pumpDeployerWallet || body.payoutWallet : body.pumpDeployerWallet;
    let pumpCreatorVerified = false;
    if (body.platform === 'pump' && body.pumpMint) {
      const creatorWallet = await getPumpCreatorWallet(body.pumpMint);
      if (!creatorWallet) {
        return fail('Could not verify Pump creator wallet for that mint.');
      }
      if (pumpDeployerWallet && creatorWallet !== pumpDeployerWallet) {
        return fail('Pump deployer wallet does not match the token creator.');
      }
      pumpDeployerWallet = creatorWallet;
      pumpCreatorVerified = true;
    } else if (body.platform === 'pump') {
      pumpCreatorVerified = Boolean(pumpDeployerWallet);
    }

    const stream = await createStream({
      userId: user.id,
      platform: body.platform,
      displayName: body.displayName,
      profileUrl,
      streamUrl,
      payoutWallet: body.payoutWallet,
      priceSol: body.priceSol,
      defaultBannerUrl,
      defaultChartTokenAddress,
      pumpMint: body.platform === 'pump' ? pumpMint : null,
      pumpDeployerWallet: body.platform === 'pump' ? pumpDeployerWallet ?? null : null,
      pumpCreatorVerified,
    });

    return ok({
      stream,
      overlayUrl: `${getSiteUrl()}/overlay/${stream.id}?key=${createOverlayHeartbeatKey(stream.id)}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create stream.', 400);
  }
}
