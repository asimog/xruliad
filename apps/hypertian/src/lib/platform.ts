import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { STREAM_HEARTBEAT_STALE_MS } from '@/lib/constants';

export const streamPlatformSchema = z.enum(['x', 'pump']);
export const adTypeSchema = z.enum(['chart', 'banner']);
export const adStatusSchema = z.enum([
  'pending_payment',
  'pending_streamer_approval',
  'active',
  'rejected',
  'expired',
]);

export function isFreshHeartbeat(lastHeartbeat: string | null | undefined, now = Date.now()) {
  if (!lastHeartbeat) {
    return false;
  }

  return now - new Date(lastHeartbeat).getTime() <= STREAM_HEARTBEAT_STALE_MS;
}

export function assertHttpsUrl(value: string, label = 'URL') {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${label} must use https://.`);
  }

  return url.toString();
}

export function sanitizeOptionalHttpsUrl(value: string | null | undefined, label = 'URL') {
  if (!value) {
    return null;
  }

  return assertHttpsUrl(value, label);
}

export function assertSolanaWallet(value: string, label = 'Solana wallet') {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${label} must be a valid Solana wallet address.`);
  }
}
