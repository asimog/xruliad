import { PUMP_SOURCES } from "@/lib/constants";
import { logger } from "@/lib/logging/logger";
import {
  resolveMemecoinMetadata,
  type ResolvedMemecoinMetadata,
} from "@/lib/memecoins/metadata";

import { WalletTransaction } from "./fetchWalletActivity";
import { PumpTradeLike } from "./types";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const METADATA_CONCURRENCY_LIMIT = 6;

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

function parseTokenAmount(input: {
  tokenAmount?: number;
  decimals?: number;
}): number {
  const raw = asNumber(input.tokenAmount);
  if (!input.decimals || raw <= 0) {
    return raw;
  }

  if (raw >= 10 ** input.decimals) {
    return raw / 10 ** input.decimals;
  }

  return raw;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: safeLimit }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index]!, index);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function filterPumpActivity(input: {
  wallet: string;
  transactions: WalletTransaction[];
}): Promise<PumpTradeLike[]> {
  const walletLc = input.wallet.toLowerCase();
  const candidates: Array<{
    timestamp: number;
    signature: string;
    source: string;
    mint: string;
    side: "buy" | "sell";
    tokenAmount: number;
    solAmount: number;
  }> = [];

  for (const tx of input.transactions) {
    if (tx.transactionError) {
      continue;
    }

    const source = (tx.source ?? "UNKNOWN").toUpperCase();
    const isPumpSource =
      PUMP_SOURCES.has(source) ||
      (tx.description ?? "").toLowerCase().includes("pump.fun");

    const tokenTransfers = (tx.tokenTransfers ?? []).filter((transfer) => {
      const from = transfer.fromUserAccount?.toLowerCase();
      const to = transfer.toUserAccount?.toLowerCase();
      const touchesWallet = from === walletLc || to === walletLc;
      return touchesWallet && transfer.mint && transfer.mint !== SOL_MINT;
    });

    if (!tokenTransfers.length) {
      continue;
    }

    const nativeTransfers = tx.nativeTransfers ?? [];
    const solSpent = nativeTransfers
      .filter((nativeTransfer) => nativeTransfer.fromUserAccount === input.wallet)
      .reduce((sum, nativeTransfer) => sum + toSol(asNumber(nativeTransfer.amount)), 0);
    const solReceived = nativeTransfers
      .filter((nativeTransfer) => nativeTransfer.toUserAccount === input.wallet)
      .reduce((sum, nativeTransfer) => sum + toSol(asNumber(nativeTransfer.amount)), 0);

    const buyCount = tokenTransfers.filter(
      (transfer) => transfer.toUserAccount?.toLowerCase() === walletLc,
    ).length;
    const sellCount = tokenTransfers.filter(
      (transfer) => transfer.fromUserAccount?.toLowerCase() === walletLc,
    ).length;

    for (const transfer of tokenTransfers) {
      const isBuy = transfer.toUserAccount?.toLowerCase() === walletLc;
      const side: "buy" | "sell" = isBuy ? "buy" : "sell";

      candidates.push({
        timestamp: tx.timestamp ?? 0,
        signature: tx.signature,
        source: isPumpSource ? "PUMP_FUN" : source,
        mint: transfer.mint,
        side,
        tokenAmount: parseTokenAmount(transfer),
        solAmount:
          side === "buy"
            ? solSpent / Math.max(1, buyCount)
            : solReceived / Math.max(1, sellCount),
      });
    }
  }

  const uniqueMints = [...new Set(candidates.map((candidate) => candidate.mint))];
  const metadataEntries = await mapWithConcurrency(
    uniqueMints,
    METADATA_CONCURRENCY_LIMIT,
    async (mint) => {
      try {
        const metadata = await resolveMemecoinMetadata({
          address: mint,
          chain: "solana",
        });
        return [mint, metadata] as const;
      } catch (error) {
        logger.warn("wallet_recap_token_metadata_failed", {
          component: "pump_filter",
          stage: "resolve_memecoin_metadata",
          mint,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });

        const fallbackMetadata: ResolvedMemecoinMetadata = {
            chain: "solana",
            address: mint,
            name: mint.slice(0, 6),
            symbol: "UNKNOWN",
            image: null,
            description: null,
            isPump: false,
            links: [],
            marketSnapshot: {
              priceUsd: null,
              marketCapUsd: null,
              liquidityUsd: null,
              volume24hUsd: null,
              pairUrl: null,
            },
          };

        return [mint, fallbackMetadata] as const;
      }
    },
  );
  const metadataMap = new Map(metadataEntries);

  return candidates
    .map((candidate): PumpTradeLike | null => {
      const metadata = metadataMap.get(candidate.mint);
      if (!metadata) {
        return null;
      }

      const isPumpTrade =
        candidate.source === "PUMP_FUN" || metadata.isPump === true;
      if (!isPumpTrade) {
        return null;
      }

      return {
        timestamp: candidate.timestamp,
        signature: candidate.signature,
        source: candidate.source,
        mint: candidate.mint,
        symbol: metadata.symbol,
        name: metadata.name,
        image: metadata.image ?? null,
        side: candidate.side,
        tokenAmount: candidate.tokenAmount,
        solAmount: candidate.solAmount,
      };
    })
    .filter((trade): trade is PumpTradeLike => trade !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}
