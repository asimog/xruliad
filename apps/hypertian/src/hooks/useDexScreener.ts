'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface DexPairSnapshot {
  priceUsd?: number;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  priceChange?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  pairAddress?: string;
  baseToken?: {
    name?: string;
    symbol?: string;
    address?: string;
  };
  quoteToken?: {
    name?: string;
    symbol?: string;
    address?: string;
  };
}

export interface DexScreenerState {
  data: DexPairSnapshot | null;
  history: Array<{ time: number; value: number }>;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 15_000;
const TOKEN_CALL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const tokenCallTimestamps: Record<string, number> = {};

export function useDexScreener(tokenAddress: string | null, chain = 'solana') {
  const [state, setState] = useState<DexScreenerState>({
    data: null,
    history: [],
    loading: true,
    error: null,
  });

  const appendPoint = useCallback((price: number) => {
    setState((current) => ({
      ...current,
      history: [
        ...current.history.slice(-119),
        {
          time: Math.floor(Date.now() / 1000),
          value: price,
        },
      ],
    }));
  }, []);

  const fetchPair = useCallback(async () => {
    if (!tokenAddress) {
      setState((current) => ({ ...current, loading: false, error: 'Missing token address.' }));
      return;
    }

    // Rate limit: only allow calls once per 10 minutes per token
    const callKey = `${tokenAddress}-${chain}`;
    const lastCall = tokenCallTimestamps[callKey] || 0;
    const now = Date.now();

    if (now - lastCall < TOKEN_CALL_COOLDOWN_MS && state.data) {
      // Skip this call if we have cached data
      return;
    }
    tokenCallTimestamps[callKey] = now;

    try {
      setState((current) => ({ ...current, loading: current.data ? current.loading : true, error: null }));
      const response = await fetch(`/api/dex/pair?chain=${encodeURIComponent(chain)}&token=${encodeURIComponent(tokenAddress)}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Pair lookup failed.');
      }

      const json = (await response.json()) as { pair?: DexPairSnapshot };
      const pair = json.pair ?? null;

      setState((current) => ({
        ...current,
        data: pair,
        loading: false,
        error: null,
      }));

      if (pair?.priceUsd) {
        appendPoint(Number(pair.priceUsd));
      }
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        error: 'Failed to fetch token data.',
      }));
    }
  }, [appendPoint, chain, tokenAddress, state.data]);

  useEffect(() => {
    void fetchPair();
    if (!tokenAddress) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchPair();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchPair, tokenAddress]);

  return useMemo(() => state, [state]);
}
