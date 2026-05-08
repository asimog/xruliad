import { DexCandle, DexPair, SupportedChain } from '@/lib/types';

const API_BASE = 'https://api.dexscreener.com';

interface DexSearchResponse {
  pairs?: DexPair[];
}

function normalizeChain(chain: string): SupportedChain {
  switch (chain.toLowerCase()) {
    case 'solana':
    case 'ethereum':
    case 'base':
    case 'bsc':
    case 'arbitrum':
    case 'polygon':
      return chain.toLowerCase() as SupportedChain;
    default:
      return 'solana';
  }
}

export async function searchDexPairs(query: string) {
  const response = await fetch(`${API_BASE}/latest/dex/search?q=${encodeURIComponent(query)}`, {
    next: { revalidate: 15 },
  });
  if (!response.ok) {
    throw new Error(`DEX_SEARCH_${response.status}`);
  }

  const json = (await response.json()) as DexSearchResponse;
  return (json.pairs || []).map((pair) => ({
    pair: {
      ...pair,
      chainId: normalizeChain(pair.chainId),
    },
    sponsored: Boolean(pair.boosts?.active),
  }));
}

export async function getPairsByTokenAddress(chain: SupportedChain, tokenAddress: string) {
  const response = await fetch(`${API_BASE}/token-pairs/v1/${chain}/${tokenAddress}`, {
    next: { revalidate: 15 },
  });
  if (!response.ok) {
    throw new Error(`DEX_TOKEN_PAIRS_${response.status}`);
  }
  return ((await response.json()) as DexPair[]).map((pair) => ({
    ...pair,
    chainId: normalizeChain(pair.chainId),
  }));
}

export async function getPair(chain: SupportedChain, pairAddress: string) {
  const response = await fetch(`${API_BASE}/latest/dex/pairs/${chain}/${pairAddress}`, {
    next: { revalidate: 15 },
  });
  if (!response.ok) {
    throw new Error(`DEX_PAIR_${response.status}`);
  }

  const json = (await response.json()) as DexSearchResponse;
  const pair = json.pairs?.[0];
  if (!pair) {
    throw new Error('Pair not found.');
  }
  return {
    ...pair,
    chainId: normalizeChain(pair.chainId),
  };
}

// DexScreener does not publicly document candle APIs. The overlay uses derived
// candles from pair snapshots so OBS stays responsive even when WebSocket data
// drops and the app falls back to REST refreshes.
export function toSyntheticCandles(points: Array<{ priceUsd: number; timestamp: number; volume?: number }>): DexCandle[] {
  return points.map((point, index, all) => {
    const previous = all[index - 1];
    const open = previous?.priceUsd ?? point.priceUsd;
    const close = point.priceUsd;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    return {
      time: point.timestamp,
      open,
      high,
      low,
      close,
      volume: point.volume ?? 0,
    };
  });
}
