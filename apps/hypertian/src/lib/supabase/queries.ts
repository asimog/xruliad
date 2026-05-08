import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBannerReviewState, getPaidAdActivationState } from '@/lib/ad-state';
import { DEFAULT_AD_DURATION_MINUTES, DEFAULT_AD_PRICE_SOL, DEFAULT_CHART_TOKEN_ADDRESS, STREAM_PLATFORM_PRIORITY } from '@/lib/constants';
import { getServerEnv, isSupabaseAdminEnabled } from '@/lib/env';
import { assertSolanaWallet } from '@/lib/platform';
import { getPaymentRoute } from '@/lib/payment-routing';
import { generateSolanaDepositAccount, sweepEscrowBalance, verifyDirectSolPayment } from '@/lib/solana';
import {
  AdRecord,
  AdStatus,
  AdType,
  AppUser,
  PaymentRecord,
  PublicPaymentStatus,
  StreamPlatform,
  StreamRecord,
  UserRole,
} from '@/lib/types';

export async function upsertUser(input: {
  privyId: string;
  walletAddress: string | null;
  role: UserRole;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        privy_id: input.privyId,
        wallet_address: input.walletAddress,
        role: input.role,
      },
      { onConflict: 'privy_id' },
    )
    .select()
    .single<AppUser>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserByPrivyId(privyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('users').select('*').eq('privy_id', privyId).maybeSingle<AppUser>();
  if (error) {
    throw error;
  }
  return data;
}

export async function listUserStreams(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<StreamRecord[]>();
  if (error) {
    throw error;
  }
  return data;
}

export async function createStream(input: {
  userId: string;
  platform: StreamPlatform;
  displayName: string;
  profileUrl: string;
  streamUrl: string;
  priceSol?: number;
  payoutWallet: string;
  defaultBannerUrl?: string | null;
  defaultChartTokenAddress?: string | null;
  pumpMint?: string | null;
  pumpDeployerWallet?: string | null;
  pumpCreatorVerified?: boolean;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .insert({
      user_id: input.userId,
      platform: input.platform,
      display_name: input.displayName,
      profile_url: input.profileUrl,
      stream_url: input.streamUrl,
      price_sol: input.priceSol ?? DEFAULT_AD_PRICE_SOL,
      payout_wallet: input.platform === 'pump' ? input.pumpDeployerWallet ?? input.payoutWallet : input.payoutWallet,
      default_banner_url: input.defaultBannerUrl ?? null,
      default_chart_token_address: input.platform === 'pump' ? input.pumpMint : input.defaultChartTokenAddress ?? DEFAULT_CHART_TOKEN_ADDRESS,
      verification_status: input.platform === 'pump' && input.pumpCreatorVerified ? 'verified' : 'unverified',
      pump_mint: input.pumpMint ?? null,
      pump_deployer_wallet: input.pumpDeployerWallet ?? null,
      pump_creator_verified: input.pumpCreatorVerified ?? false,
    })
    .select()
    .single<StreamRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function updateStream(input: {
  streamId: string;
  userId: string;
  displayName: string;
  profileUrl: string;
  streamUrl: string;
  priceSol: number;
  payoutWallet: string;
  defaultBannerUrl?: string | null;
  defaultChartTokenAddress?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .update({
      display_name: input.displayName,
      profile_url: input.profileUrl,
      stream_url: input.streamUrl,
      price_sol: input.priceSol,
      payout_wallet: input.payoutWallet,
      default_banner_url: input.defaultBannerUrl ?? null,
      default_chart_token_address: input.defaultChartTokenAddress ?? DEFAULT_CHART_TOKEN_ADDRESS,
    })
    .eq('id', input.streamId)
    .eq('user_id', input.userId)
    .select()
    .single<StreamRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getStreamById(streamId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('streams').select('*').eq('id', streamId).maybeSingle<StreamRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function listPublicStreams() {
  if (!isSupabaseAdminEnabled()) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .not('payout_wallet', 'is', null)
    .order('created_at', { ascending: false })
    .returns<StreamRecord[]>();
  if (error) {
    throw error;
  }
  return sortStreamsByBookingPriority(data ?? []);
}

export async function listActiveAdsForStream(streamId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select(
      [
        'id',
        'stream_id',
        'ad_type',
        'status',
        'token_address',
        'chain',
        'dex_pair_address',
        'banner_url',
        'duration_minutes',
        'starts_at',
        'payment_tx_signature',
        'position',
        'size',
        'is_active',
        'is_hidden',
        'expires_at',
        'created_at',
      ].join(', '),
    )
    .eq('stream_id', streamId)
    .eq('is_active', true)
    .eq('is_hidden', false)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .returns<AdRecord[]>();
  if (error) {
    throw error;
  }
  return data;
}

export function sortStreamsByBookingPriority(streams: StreamRecord[]) {
  return [...streams].sort((left, right) => {
    const platformDelta = STREAM_PLATFORM_PRIORITY[left.platform] - STREAM_PLATFORM_PRIORITY[right.platform];
    if (platformDelta !== 0) {
      return platformDelta;
    }

    const leftHeartbeat = left.last_heartbeat ? new Date(left.last_heartbeat).getTime() : 0;
    const rightHeartbeat = right.last_heartbeat ? new Date(right.last_heartbeat).getTime() : 0;
    if (leftHeartbeat !== rightHeartbeat) {
      return rightHeartbeat - leftHeartbeat;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export async function listAdsForStreamer(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*, streams!inner(user_id)')
    .eq('streams.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map(({ streams, ...ad }) => ad) as AdRecord[];
}

export async function listAdsForSponsor(walletAddress: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('sponsor_wallet', walletAddress)
    .order('created_at', { ascending: false })
    .returns<AdRecord[]>();
  if (error) {
    throw error;
  }
  return data;
}

export async function createAdWithPayment(input: {
  streamId: string;
  sponsorId?: string | null;
  sponsorWallet?: string | null;
  tokenAddress: string;
  chain: string;
  position: string;
  size: string;
  expiresAt: string;
  amount: number;
  currency: string;
}) {
  const supabase = createAdminClient();
  const depositAccount = generateSolanaDepositAccount();
  const { data: ad, error: adError } = await supabase
    .from('ads')
    .insert({
      stream_id: input.streamId,
      sponsor_id: input.sponsorId ?? null,
      sponsor_wallet: input.sponsorWallet ?? null,
      token_address: input.tokenAddress,
      chain: input.chain,
      position: input.position,
      size: input.size,
      is_active: false,
      expires_at: input.expiresAt,
    })
    .select()
    .single<AdRecord>();
  if (adError) {
    throw adError;
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      ad_id: ad.id,
      amount: input.amount,
      currency: input.currency,
      deposit_address: depositAccount.address,
      deposit_secret: depositAccount.secret,
      status: 'pending',
    })
    .select()
    .single<PaymentRecord>();

  if (paymentError) {
    throw paymentError;
  }

  return { ad, payment };
}

export async function createAdWithDirectPayment(input: {
  streamId: string;
  adType: AdType;
  sponsorId?: string | null;
  sponsorWallet?: string | null;
  tokenAddress?: string | null;
  chain?: string | null;
  dexPairAddress?: string | null;
  bannerUrl?: string | null;
  position: string;
  size: string;
  advertiserContact?: string | null;
  advertiserNote?: string | null;
}) {
  const stream = await getStreamById(input.streamId);
  if (!stream) {
    throw new Error('Stream not found.');
  }
  if (!stream.payout_wallet) {
    throw new Error('Stream is missing a payout wallet.');
  }
  const payoutWallet =
    stream.platform === 'pump'
      ? assertSolanaWallet(stream.pump_deployer_wallet ?? stream.payout_wallet, 'Pump deployer wallet')
      : assertSolanaWallet(stream.payout_wallet, 'Payout wallet');

  const amount = Number(stream.price_sol ?? DEFAULT_AD_PRICE_SOL);
  const durationMinutes = DEFAULT_AD_DURATION_MINUTES;
  const escrowAccount = generateSolanaDepositAccount();
  const env = getServerEnv();
  const paymentRoute = getPaymentRoute({
    adType: input.adType,
    platform: stream.platform,
    payoutWallet,
    amount,
    escrowAddress: escrowAccount.address,
    escrowSecret: escrowAccount.secret,
    platformTreasuryWallet: env.NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA ?? null,
  });
  const supabase = createAdminClient();
  const { data: ad, error: adError } = await supabase
    .from('ads')
    .insert({
      stream_id: input.streamId,
      sponsor_id: input.sponsorId ?? null,
      sponsor_wallet: input.sponsorWallet ?? null,
      ad_type: input.adType,
      status: 'pending_payment',
      token_address: input.tokenAddress ?? '',
      chain: input.chain ?? 'solana',
      dex_pair_address: input.dexPairAddress ?? null,
      banner_url: input.bannerUrl ?? null,
      duration_minutes: durationMinutes,
      position: input.position,
      size: input.size,
      is_active: false,
      expires_at: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
      paid_to_wallet: paymentRoute.paidToWallet,
      advertiser_contact: input.advertiserContact ?? null,
      advertiser_note: input.advertiserNote ?? null,
    })
    .select()
    .single<AdRecord>();

  if (adError) {
    throw adError;
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      ad_id: ad.id,
      amount,
      currency: 'SOL',
      deposit_address: paymentRoute.depositAddress,
      deposit_secret: paymentRoute.depositSecret,
      payment_recipient_kind: paymentRoute.recipientKind,
      commission_bps: paymentRoute.commissionBps,
      platform_fee_amount: paymentRoute.platformFeeAmount,
      streamer_amount: paymentRoute.streamerAmount,
      platform_treasury_wallet: paymentRoute.platformTreasuryWallet,
      status: 'pending',
    })
    .select()
    .single<PaymentRecord>();

  if (paymentError) {
    throw paymentError;
  }

  return { ad, payment, stream, amount, durationMinutes, paymentRoute };
}

export async function verifyDirectPaymentForAd(input: {
  paymentId?: string | null;
  adId?: string | null;
  txSignature: string;
}) {
  const supabase = createAdminClient();
  let query = supabase.from('payments').select('*, ads(*)');
  query = input.paymentId ? query.eq('id', input.paymentId) : query.eq('ad_id', input.adId);
  const { data, error } = await query.single();

  if (error) {
    throw error;
  }

  const payment = data as PaymentRecord & { ads: AdRecord };
  const ad = payment.ads;
  if (!payment.deposit_address) {
    throw new Error('Payment recipient is missing.');
  }

  if (!input.paymentId && !input.adId) {
    throw new Error('paymentId or adId is required.');
  }

  // If already verified with this transaction, return early (idempotency)
  if (payment.status === 'verified' && payment.tx_hash === input.txSignature) {
    return {
      payment,
      ad,
      status: ad.status as AdStatus,
      amountReceived: Number(payment.amount),
      sweepTxHash: null,
    };
  }

  // If payment is verified but with different tx, that's an error
  if (payment.status === 'verified' && payment.tx_hash !== input.txSignature) {
    throw new Error('Payment already verified with a different transaction.');
  }

  if (ad.status === 'active' || ad.status === 'pending_streamer_approval') {
    return {
      payment,
      ad,
      status: ad.status as AdStatus,
      amountReceived: Number(payment.amount),
    };
  }

  const checkoutTime = Math.floor(new Date(payment.created_at).getTime() / 1000) - 60;
  const status = await verifyDirectSolPayment({
    signature: input.txSignature,
    recipient: payment.deposit_address,
    amount: Number(payment.amount),
    minBlockTime: checkoutTime,
  });

  if (!status.verified) {
    return {
      payment,
      ad,
      status: 'pending_payment' as AdStatus,
      amountReceived: status.amountReceived,
      reason: status.reason,
    };
  }

  let sweep = null;
  if (payment.payment_recipient_kind === 'escrow' && payment.deposit_secret && ad.paid_to_wallet) {
    sweep = await sweepEscrowBalance({
      depositAddress: payment.deposit_address,
      encryptedSecret: payment.deposit_secret,
      streamerWallet: ad.paid_to_wallet,
      platformTreasuryWallet: payment.platform_treasury_wallet ?? null,
      expectedStreamerAmount: Number(payment.streamer_amount ?? payment.amount),
      expectedPlatformFeeAmount: Number(payment.platform_fee_amount ?? 0),
    });

    if (!sweep.swept) {
      throw new Error(sweep.reason);
    }
  }

  const now = new Date();
  const activation = getPaidAdActivationState({
    adType: ad.ad_type,
    durationMinutes: ad.duration_minutes,
    existingExpiresAt: ad.expires_at,
    now,
  });

  // Update payment first (idempotent update - only set fields if not already set)
  const { data: updatedPayment, error: paymentError } = await supabase
    .from('payments')
    .update({
      tx_hash: input.txSignature,
      status: 'verified',
      verified_at: now.toISOString(),
    })
    .eq('id', payment.id)
    .select()
    .single<PaymentRecord>();

  if (paymentError) {
    throw paymentError;
  }

  // Update ad with payment activation state
  const { data: updatedAd, error: adError } = await supabase
    .from('ads')
    .update({
      payment_tx_signature: input.txSignature,
      status: activation.status,
      is_active: activation.isActive,
      starts_at: activation.startsAt,
      expires_at: activation.expiresAt,
    })
    .eq('id', ad.id)
    .select()
    .single<AdRecord>();

  if (adError) {
    throw adError;
  }

  return {
    payment: updatedPayment,
    ad: updatedAd,
    status: activation.status,
    amountReceived: status.amountReceived,
    sweepTxHash: sweep?.txHash ?? null,
  };
}

export function toPublicPaymentStatus(payment: PaymentRecord): PublicPaymentStatus {
  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    deposit_address: payment.deposit_address,
    payment_recipient_kind: payment.payment_recipient_kind ?? null,
    commission_bps: payment.commission_bps ?? null,
    platform_fee_amount: payment.platform_fee_amount ?? null,
    streamer_amount: payment.streamer_amount ?? null,
    platform_treasury_wallet: payment.platform_treasury_wallet ?? null,
    verified_at: payment.verified_at,
    created_at: payment.created_at,
  };
}

export async function reviewBannerAd(input: {
  adId: string;
  streamerId: string;
  decision: 'approved' | 'rejected';
}) {
  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from('ads')
    .select('*, streams!inner(user_id)')
    .eq('id', input.adId)
    .single();

  if (fetchError) {
    throw fetchError;
  }
  if (existing.streams?.user_id !== input.streamerId) {
    throw new Error('You are not authorized to review this ad.');
  }
  if (existing.ad_type !== 'banner') {
    throw new Error('Only banner ads require streamer approval.');
  }
  if (existing.status !== 'pending_streamer_approval') {
    throw new Error('Banner ad must be paid before streamer approval.');
  }

  const review = getBannerReviewState({
    decision: input.decision,
    durationMinutes: existing.duration_minutes,
    existingExpiresAt: existing.expires_at,
  });
  const { data, error } = await supabase
    .from('ads')
    .update({
      status: review.status,
      is_active: review.isActive,
      starts_at: review.startsAt,
      expires_at: review.expiresAt,
    })
    .eq('id', input.adId)
    .select()
    .single<AdRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPaymentWithAd(paymentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payments')
    .select('*, ads(*)')
    .eq('id', paymentId)
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function getPayment(paymentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).single<PaymentRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function verifyPayment(input: { paymentId: string; txHash: string }) {
  const supabase = createAdminClient();
  const now = new Date();
  const { data: payment, error: fetchPaymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', input.paymentId)
    .single<PaymentRecord>();
  if (fetchPaymentError) {
    throw fetchPaymentError;
  }

  // Idempotency check - if already verified with this txHash, return early
  if (payment.status === 'verified' && payment.tx_hash === input.txHash) {
    const { data: ad, error: fetchAdError } = await supabase
      .from('ads')
      .select('*')
      .eq('id', payment.ad_id)
      .single<AdRecord>();
    if (fetchAdError) {
      return payment;
    }
    return payment;
  }

  const { data: ad, error: fetchAdError } = await supabase
    .from('ads')
    .select('*')
    .eq('id', payment.ad_id)
    .single<AdRecord>();
  if (fetchAdError) {
    throw fetchAdError;
  }

  const activation = getPaidAdActivationState({
    adType: ad.ad_type,
    durationMinutes: ad.duration_minutes,
    existingExpiresAt: ad.expires_at,
    now,
  });

  const { error: adError } = await supabase
    .from('ads')
    .update({
      payment_tx_signature: input.txHash,
      status: activation.status,
      is_active: activation.isActive,
      starts_at: activation.startsAt,
      expires_at: activation.expiresAt,
    })
    .eq('id', payment.ad_id);
  if (adError) {
    throw adError;
  }

  const { data: verifiedPayment, error: paymentError } = await supabase
    .from('payments')
    .update({
      tx_hash: input.txHash,
      status: 'verified',
      verified_at: now.toISOString(),
    })
    .eq('id', input.paymentId)
    .select()
    .single<PaymentRecord>();
  if (paymentError) {
    throw paymentError;
  }

  return verifiedPayment;
}

export async function listPendingPayments(limit = 25) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .not('deposit_address', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit)
    .returns<PaymentRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}
