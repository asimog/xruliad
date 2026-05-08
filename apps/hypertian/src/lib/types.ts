export type UserRole = 'streamer' | 'sponsor';
export type AssetKind = 'SOL' | 'USDC';
export type PaymentStatus = 'pending' | 'submitted' | 'verified' | 'failed';
export type AdPosition = 'bottom-right';
export type AdSize = 'small' | 'medium' | 'large';
export type OverlayTheme = 'dark' | 'light';
export type SupportedChain = 'solana' | 'ethereum' | 'base' | 'bsc' | 'arbitrum' | 'polygon';
export type StreamPlatform = 'x' | 'pump';
export type PaymentRecipientKind = 'streamer_direct' | 'escrow';
export type StreamVerificationStatus = 'unverified' | 'pending' | 'verified';
export type AdType = 'chart' | 'banner';
export type AdStatus = 'pending_payment' | 'pending_streamer_approval' | 'active' | 'rejected' | 'expired';

export interface AppUser {
  id: string;
  privy_id: string;
  wallet_address: string | null;
  role: UserRole;
  created_at: string;
}

export interface StreamRecord {
  id: string;
  user_id: string;
  platform: StreamPlatform;
  display_name: string | null;
  profile_url: string | null;
  stream_url: string | null;
  price_sol: number | null;
  payout_wallet: string | null;
  default_banner_url: string | null;
  default_chart_token_address: string | null;
  overlay_secret_hash: string | null;
  overlay_verified_at: string | null;
  verification_status: StreamVerificationStatus | null;
  pump_mint: string | null;
  pump_deployer_wallet: string | null;
  pump_creator_verified: boolean | null;
  last_heartbeat: string | null;
  owner_session?: string | null;
  is_hidden?: boolean | null;
  created_at: string;
}

export interface AdRecord {
  id: string;
  stream_id: string;
  sponsor_id?: string | null;
  sponsor_wallet?: string | null;
  ad_type?: AdType | null;
  status?: AdStatus | null;
  token_address: string;
  chain: string;
  dex_pair_address?: string | null;
  banner_url?: string | null;
  duration_minutes?: number | null;
  starts_at?: string | null;
  payment_tx_signature?: string | null;
  paid_to_wallet?: string | null;
  advertiser_contact?: string | null;
  advertiser_note?: string | null;
  position: string;
  size: string;
  is_active: boolean;
  is_hidden?: boolean | null;
  expires_at: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  ad_id: string;
  tx_hash: string | null;
  amount: number;
  currency: AssetKind;
  status: string;
  deposit_address: string | null;
  deposit_secret: string | null;
  payment_recipient_kind?: PaymentRecipientKind | null;
  commission_bps?: number | null;
  platform_fee_amount?: number | null;
  streamer_amount?: number | null;
  platform_treasury_wallet?: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface PublicPaymentStatus {
  id: string;
  amount: number;
  currency: AssetKind;
  status: string;
  deposit_address: string | null;
  payment_recipient_kind?: PaymentRecipientKind | null;
  commission_bps?: number | null;
  platform_fee_amount?: number | null;
  streamer_amount?: number | null;
  platform_treasury_wallet?: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface OverlayActiveAd extends AdRecord {
  media_src: string | null;
  media_type: 'image' | 'gif' | 'video' | null;
}

export interface OverlayStreamState {
  stream: StreamRecord | null;
  ads: OverlayActiveAd[];
}

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  priceUsd: string | null;
  priceNative: string | null;
  fdv?: number | null;
  marketCap?: number | null;
  liquidity?: {
    usd?: number | null;
    base?: number | null;
    quote?: number | null;
  } | null;
  boosts?: {
    active?: number | null;
  } | null;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
}

export interface DexSearchResult {
  pair: DexPair;
  sponsored: boolean;
}

export interface DexCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OverlayAdConfig {
  token: string;
  chain: SupportedChain;
  position: AdPosition;
  size: AdSize;
  theme: OverlayTheme;
  showSponsor: boolean;
  sponsorLabel?: string | null;
}
