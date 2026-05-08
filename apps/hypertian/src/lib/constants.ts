export const PLATFORM_NAME = 'Hypertian';
export const USDC_SOLANA_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const DEFAULT_AD_PRICE_SOL = 0.001;
export const DEFAULT_AD_PRICE_USDC = 25;
export const DEFAULT_AD_DURATION_HOURS = 4;
export const DEFAULT_AD_DURATION_MINUTES = 5;
export const DEFAULT_CHART_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';
export const DEFAULT_STREAM_BANNER_URL = '/docs/default-banner.gif';
export const FALLBACK_STREAM_BANNER_URL = '/social-futures.gif';
// Commission is wired through but disabled — platform takes 0% for now.
// Flip COMMISSION_ENABLED back to true (and restore the BPS) to charge again.
export const COMMISSION_ENABLED = false;
export const PUMPFUN_COMMISSION_BPS = COMMISSION_ENABLED ? 1_000 : 0;
export const STREAM_HEARTBEAT_INTERVAL_MS = 60_000;
export const STREAM_HEARTBEAT_STALE_MS = 90_000;
export const STREAM_LIVE_CLEANUP_THRESHOLD_MS = 5 * 60_000; // 5 minutes without heartbeat = not live

export const STREAM_PLATFORM_NAMES = {
  x: 'X',
  pump: 'PumpFun',
} as const;

export const STREAM_PLATFORM_PRIORITY = {
  x: 0,
  pump: 1,
} as const;
