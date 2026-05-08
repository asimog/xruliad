import 'server-only';
import { DEFAULT_AD_PRICE_SOL, DEFAULT_CHART_TOKEN_ADDRESS, STREAM_HEARTBEAT_STALE_MS } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdRecord, PaymentRecord, StreamPlatform, StreamRecord } from '@/lib/types';

// Heartbeat staleness window for the public directory. The browser-source overlay pings
// every minute; this gives modest slack before a stream falls off from network delay.
const DIRECTORY_LIVE_WINDOW_MS = 90_000;

function isMissingRelationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'PGRST205',
  );
}

export interface AnonStreamInput {
  ownerSession: string;
  platform: StreamPlatform;
  displayName: string;
  profileUrl: string;
  streamUrl: string;
  payoutWallet: string;
  priceSol?: number | null;
  defaultBannerUrl?: string | null;
  defaultChartTokenAddress?: string | null;
  pumpMint?: string | null;
  pumpDeployerWallet?: string | null;
}

export async function createAnonymousStream(input: AnonStreamInput) {
  const supabase = createAdminClient();
  const payoutWallet = input.platform === 'pump' ? input.pumpDeployerWallet ?? input.payoutWallet : input.payoutWallet;
  const { data, error } = await supabase
    .from('streams')
    .insert({
      user_id: null,
      owner_session: input.ownerSession,
      platform: input.platform,
      display_name: input.displayName,
      profile_url: input.profileUrl,
      stream_url: input.streamUrl,
      price_sol: input.priceSol ?? DEFAULT_AD_PRICE_SOL,
      payout_wallet: payoutWallet,
      default_banner_url: input.defaultBannerUrl ?? null,
      default_chart_token_address: input.platform === 'pump' ? input.pumpMint : input.defaultChartTokenAddress ?? DEFAULT_CHART_TOKEN_ADDRESS,
      verification_status: 'unverified',
      pump_mint: input.platform === 'pump' ? input.pumpMint ?? null : null,
      pump_deployer_wallet: input.platform === 'pump' ? payoutWallet : null,
      pump_creator_verified: false,
      is_hidden: false,
    })
    .select()
    .single<StreamRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listStreamsByOwnerSession(ownerSession: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('owner_session', ownerSession)
    .order('created_at', { ascending: false })
    .returns<StreamRecord[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

export async function getStreamForOwner(streamId: string, ownerSession: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('id', streamId)
    .eq('owner_session', ownerSession)
    .maybeSingle<StreamRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOwnerStreamBanner(streamId: string, ownerSession: string, bannerUrl: string | null) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .update({ default_banner_url: bannerUrl })
    .eq('id', streamId)
    .eq('owner_session', ownerSession)
    .select()
    .single<StreamRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export interface DirectoryStream {
  id: string;
  display_name: string | null;
  platform: StreamPlatform;
  profile_url: string | null;
  stream_url: string | null;
  price_sol: number | null;
  default_banner_url: string | null;
  default_chart_token_address: string | null;
  pump_mint: string | null;
  last_heartbeat: string | null;
  created_at: string;
}

export async function listLiveDirectoryStreams() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - DIRECTORY_LIVE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('streams')
    .select('id, display_name, platform, profile_url, stream_url, price_sol, default_banner_url, default_chart_token_address, pump_mint, last_heartbeat, created_at')
    .eq('is_hidden', false)
    .gte('last_heartbeat', cutoff)
    .order('last_heartbeat', { ascending: false })
    .limit(200)
    .returns<DirectoryStream[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

export async function getStreamHeartbeatStatus(streamId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('id, last_heartbeat, overlay_verified_at')
    .eq('id', streamId)
    .maybeSingle<{ id: string; last_heartbeat: string | null; overlay_verified_at: string | null }>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const heartbeatMs = data.last_heartbeat ? new Date(data.last_heartbeat).getTime() : null;
  const fresh = heartbeatMs ? Date.now() - heartbeatMs <= STREAM_HEARTBEAT_STALE_MS : false;

  return {
    streamId: data.id,
    isLive: fresh,
    lastHeartbeat: data.last_heartbeat,
    overlayVerifiedAt: data.overlay_verified_at,
    everReceived: Boolean(heartbeatMs),
  };
}

export interface FeedJobCard {
  ad: AdRecord;
  stream: Pick<StreamRecord, 'id' | 'display_name' | 'platform'> | null;
  payments: Pick<PaymentRecord, 'id' | 'amount' | 'currency' | 'status' | 'tx_hash' | 'verified_at' | 'created_at'>[];
}

export async function listPublicFeed(limit = 60): Promise<FeedJobCard[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select(`
      id,
      stream_id,
      ad_type,
      status,
      token_address,
      chain,
      dex_pair_address,
      banner_url,
      duration_minutes,
      starts_at,
      payment_tx_signature,
      position,
      size,
      is_active,
      is_hidden,
      expires_at,
      created_at,
      streams(id, display_name, platform),
      payments(id, amount, currency, status, tx_hash, verified_at, created_at)
    `)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => {
    const { streams, payments, ...ad } = row as unknown as Partial<AdRecord> & {
      streams: { id: string; display_name: string | null; platform: StreamPlatform } | { id: string; display_name: string | null; platform: StreamPlatform }[] | null;
      payments: FeedJobCard['payments'];
    };
    const stream = Array.isArray(streams) ? streams[0] ?? null : streams;
    return {
      ad: ad as AdRecord,
      stream,
      payments: payments ?? [],
    } satisfies FeedJobCard;
  });
}

export async function getPublicFeedItem(adId: string): Promise<FeedJobCard | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select(`
      id,
      stream_id,
      ad_type,
      status,
      token_address,
      chain,
      dex_pair_address,
      banner_url,
      duration_minutes,
      starts_at,
      payment_tx_signature,
      position,
      size,
      is_active,
      is_hidden,
      expires_at,
      created_at,
      streams(id, display_name, platform),
      payments(id, amount, currency, status, tx_hash, verified_at, created_at)
    `)
    .eq('id', adId)
    .eq('is_hidden', false)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205') {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  const { streams, payments, ...ad } = data as unknown as Partial<AdRecord> & {
    streams: { id: string; display_name: string | null; platform: StreamPlatform } | { id: string; display_name: string | null; platform: StreamPlatform }[] | null;
    payments: FeedJobCard['payments'];
  };
  const stream = Array.isArray(streams) ? streams[0] ?? null : streams;

  return {
    ad: ad as AdRecord,
    stream,
    payments: payments ?? [],
  } satisfies FeedJobCard;
}

export async function listOwnerPendingBannerAds(ownerSession: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*, streams!inner(owner_session)')
    .eq('streams.owner_session', ownerSession)
    .eq('ad_type', 'banner')
    .eq('status', 'pending_streamer_approval')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? []).map(({ streams: _streams, ...ad }) => ad) as AdRecord[];
}

export async function getOwnerAd(adId: string, ownerSession: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*, streams!inner(owner_session)')
    .eq('id', adId)
    .eq('streams.owner_session', ownerSession)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { streams: _streams, ...ad } = data as AdRecord & { streams: { owner_session: string } };
  return ad as AdRecord;
}

export interface FeedbackInput {
  category: 'bug' | 'ad-issue' | 'feature' | 'other';
  message: string;
  email?: string | null;
  contextUrl?: string | null;
}

export async function createFeedback(input: FeedbackInput) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      category: input.category,
      message: input.message,
      email: input.email ?? null,
      context_url: input.contextUrl ?? null,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listFeedback(status: 'open' | 'resolved' | 'all' = 'all') {
  const supabase = createAdminClient();
  let query = supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function setFeedbackStatus(id: string, status: 'open' | 'resolved') {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('feedback')
    .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function setStreamHidden(streamId: string, hidden: boolean) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .update({ is_hidden: hidden })
    .eq('id', streamId)
    .select()
    .single<StreamRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function setAdHidden(adId: string, hidden: boolean) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .update({ is_hidden: hidden })
    .eq('id', adId)
    .select()
    .single<AdRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function adminTriggerHeartbeat(streamId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('streams')
    .update({ last_heartbeat: now, overlay_verified_at: now })
    .eq('id', streamId)
    .select()
    .single<StreamRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function listAllStreamsForAdmin() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<StreamRecord[]>();
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function listAllAdsForAdmin() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*, streams(id, display_name, platform), payments(id, amount, currency, status)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    throw error;
  }
  return data ?? [];
}
