import { getPairsByTokenAddress } from '@/lib/dexscreener';
import { fail, ok } from '@/lib/http';
import { adTypeSchema, assertHttpsUrl } from '@/lib/platform';
import { getOptionalPrivyUser } from '@/lib/privy';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAdWithDirectPayment, getStreamById, getUserByPrivyId, listActiveAdsForStream } from '@/lib/supabase/queries';
import { AdRecord, OverlayActiveAd } from '@/lib/types';
import { z } from 'zod';

const schema = z.object({
  streamId: z.string().min(1),
  adType: adTypeSchema.default('chart'),
  tokenAddress: z.string().optional().nullable(),
  chain: z.enum(['solana', 'ethereum', 'base', 'bsc', 'arbitrum', 'polygon']).default('solana'),
  bannerUrl: z.string().optional().nullable(),
  position: z.enum(['bottom-right']).default('bottom-right'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  advertiserContact: z.string().max(160).optional().nullable(),
  advertiserNote: z.string().max(500).optional().nullable(),
});

function getMediaType(src: string | null): OverlayActiveAd['media_type'] {
  if (!src) {
    return null;
  }
  const clean = src.split('?')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.gif')) {
    return 'gif';
  }
  if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov')) {
    return 'video';
  }
  return 'image';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const streamId = url.searchParams.get('stream') || url.searchParams.get('streamId');
    if (!streamId) {
      return fail('Missing stream parameter.');
    }

    const [stream, ads] = await Promise.all([getStreamById(streamId), listActiveAdsForStream(streamId)]);
    const overlayAds: OverlayActiveAd[] = ads.map((ad: AdRecord) => ({
      ...ad,
      media_src: ad.ad_type === 'banner' ? ad.banner_url ?? null : null,
      media_type: ad.ad_type === 'banner' ? getMediaType(ad.banner_url ?? null) : null,
    }));

    return ok({ stream, ads: overlayAds });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load active ads.');
  }
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const rateLimit = await checkRateLimit(
      request,
      { bucket: 'public_ad_create', maxAttempts: 10, windowSeconds: 60 * 60 },
      body.streamId,
    );
    if (!rateLimit.allowed) {
      return fail('Too many ad checkouts created. Please try again later.', 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const claims = await getOptionalPrivyUser();
    const sponsor = claims?.user_id ? await getUserByPrivyId(claims.user_id) : null;
    let dexPairAddress: string | null = null;
    let tokenAddress = body.tokenAddress ?? null;
    let bannerUrl = body.bannerUrl ?? null;

    if (body.adType === 'chart') {
      if (!tokenAddress || tokenAddress.length < 16) {
        return fail('Token address is required for chart ads.');
      }
      const pairs = await getPairsByTokenAddress(body.chain, tokenAddress);
      const primaryPair = pairs[0];
      if (!primaryPair) {
        return fail('No DexScreener pair found for that token.');
      }
      dexPairAddress = primaryPair.pairAddress;
    } else {
      if (!bannerUrl) {
        return fail('Banner URL is required for banner ads.');
      }
      bannerUrl = assertHttpsUrl(bannerUrl, 'Banner URL');
      tokenAddress = '';
    }

    const { ad, payment, amount, durationMinutes, paymentRoute } = await createAdWithDirectPayment({
      streamId: body.streamId,
      adType: body.adType,
      sponsorId: sponsor?.id ?? null,
      sponsorWallet: sponsor?.wallet_address ?? null,
      tokenAddress,
      chain: body.chain,
      dexPairAddress,
      bannerUrl,
      position: body.position,
      size: body.size,
      advertiserContact: body.advertiserContact ?? null,
      advertiserNote: body.advertiserNote ?? null,
    });

    return ok({
      ad: {
        id: ad.id,
        stream_id: ad.stream_id,
        ad_type: ad.ad_type,
        status: ad.status,
        token_address: ad.token_address,
        chain: ad.chain,
        dex_pair_address: ad.dex_pair_address ?? null,
        banner_url: ad.banner_url ?? null,
        duration_minutes: ad.duration_minutes ?? null,
        position: ad.position,
        size: ad.size,
        is_active: ad.is_active,
        expires_at: ad.expires_at,
        created_at: ad.created_at,
      },
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      durationMinutes,
      recipientAddress: payment.deposit_address,
      depositAddress: payment.deposit_address,
      paymentRecipientKind: paymentRoute.recipientKind,
      paidToWallet: paymentRoute.paidToWallet,
      commissionBps: paymentRoute.commissionBps,
      platformFeeAmount: paymentRoute.platformFeeAmount,
      streamerAmount: paymentRoute.streamerAmount,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create ad campaign.', 400);
  }
}
