import { filterPumpActivity } from "@/lib/analytics/filterPumpActivity";
import type { WalletTransaction } from "@/lib/analytics/fetchWalletActivity";
import type { PumpTradeLike } from "@/lib/analytics/types";
import type { PumpTrade } from "@/lib/types/domain";

function normalizeTrade(
  trade: PumpTradeLike,
  index: number,
  nowMs: number,
): PumpTrade {
  const signature = trade.signature?.trim() || `unknown-${index}`;
  const symbol = trade.symbol?.trim() || "UNKNOWN";
  const name = trade.name?.trim() || symbol;
  const timestamp = Number.isFinite(trade.timestamp) ? trade.timestamp : nowMs;
  const tokenAmount = Number.isFinite(trade.tokenAmount)
    ? trade.tokenAmount
    : 0;
  const solAmount = Number.isFinite(trade.solAmount) ? trade.solAmount : 0;

  return {
    timestamp,
    signature,
    source: trade.source?.trim() || "unknown",
    mint: trade.mint,
    symbol,
    name,
    image: trade.image ?? null,
    side: trade.side,
    tokenAmount,
    solAmount,
  };
}

export async function extractPumpTrades(
  wallet: string,
  transactions: unknown[],
): Promise<PumpTrade[]> {
  const trades = await filterPumpActivity({
    wallet,
    transactions: transactions as WalletTransaction[],
  });

  const nowMs = Date.now();
  return trades
    .filter((trade): trade is PumpTradeLike => Boolean(trade?.mint))
    .map((trade, index) => normalizeTrade(trade, index, nowMs));
}
