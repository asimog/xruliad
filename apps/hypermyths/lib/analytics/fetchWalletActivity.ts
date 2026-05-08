import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";
import { RetryableError, withRetry } from "@/lib/network/retry";

import { AnalysisRangeHours } from "./types";

const PAGE_SIZE = 100;
const MAX_TRANSACTIONS = 800;
const MAX_PAGES = 12;
const PAGE_FETCH_TIMEOUT_MS = 20_000;
const PAGE_FETCH_ATTEMPTS = 3;

export interface WalletTransactionTokenTransfer {
  mint: string;
  tokenAmount?: number;
  decimals?: number;
  fromUserAccount?: string | null;
  toUserAccount?: string | null;
}

export interface WalletTransactionNativeTransfer {
  amount: number;
  fromUserAccount?: string | null;
  toUserAccount?: string | null;
}

export interface WalletTransaction {
  signature: string;
  timestamp: number;
  source?: string | null;
  description?: string | null;
  transactionError?: unknown;
  tokenTransfers?: WalletTransactionTokenTransfer[];
  nativeTransfers?: WalletTransactionNativeTransfer[];
}

async function fetchTransactionsPage(input: {
  wallet: string;
  beforeSignature?: string;
}): Promise<WalletTransaction[]> {
  const env = getEnv();
  if (!env.HELIUS_API_KEY) {
    throw new Error(
      "Wallet trailers require HELIUS_API_KEY to fetch the last 24 hours of Solana wallet history.",
    );
  }

  const baseUrl = new URL(
    `https://api.helius.xyz/v0/addresses/${encodeURIComponent(input.wallet)}/transactions`,
  );
  baseUrl.searchParams.set("api-key", env.HELIUS_API_KEY);
  baseUrl.searchParams.set("limit", String(PAGE_SIZE));
  if (input.beforeSignature) {
    baseUrl.searchParams.set("before", input.beforeSignature);
  }

  return withRetry(
    async () => {
      const response = await fetchWithTimeout(
        baseUrl.toString(),
        {
          headers: {
            Accept: "application/json",
          },
        },
        PAGE_FETCH_TIMEOUT_MS,
      );

      if (!response.ok) {
        if (response.status >= 500 || response.status === 429) {
          throw new RetryableError(`Helius transaction fetch failed with ${response.status}`);
        }
        throw new Error(`Helius transaction fetch failed with ${response.status}`);
      }

      const payload = (await response.json()) as WalletTransaction[];
      return Array.isArray(payload) ? payload : [];
    },
    {
      attempts: PAGE_FETCH_ATTEMPTS,
      baseDelayMs: 800,
      maxDelayMs: 5_000,
      shouldRetry: (error) =>
        error instanceof RetryableError ||
        (error instanceof TypeError && error.message.length > 0),
    },
  );
}

export async function fetchWalletActivity(input: {
  wallet: string;
  rangeHours: AnalysisRangeHours;
}): Promise<WalletTransaction[]> {
  const cutoffTs =
    Math.floor(Date.now() / 1000) - input.rangeHours * 60 * 60;

  const results: WalletTransaction[] = [];
  let beforeSignature: string | undefined;
  let page = 0;

  while (page < MAX_PAGES && results.length < MAX_TRANSACTIONS) {
    const batch = await fetchTransactionsPage({
      wallet: input.wallet,
      beforeSignature,
    });

    if (!batch.length) {
      break;
    }

    results.push(...batch);
    const oldest = batch[batch.length - 1];
    beforeSignature = oldest?.signature;
    page += 1;

    if (!beforeSignature) {
      break;
    }

    if ((oldest?.timestamp ?? 0) < cutoffTs) {
      break;
    }
  }

  return results.filter((tx) => (tx.timestamp ?? 0) >= cutoffTs);
}
