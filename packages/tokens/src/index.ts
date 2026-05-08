import { isLikelyEvmAddress, isLikelySolanaAddress } from "@hypermyths/wallet";
export type TokenChain = "solana" | "ethereum" | "base";
export function detectTokenChain(address: string): TokenChain | "unknown" {
  if (isLikelySolanaAddress(address)) return "solana";
  if (isLikelyEvmAddress(address)) return "ethereum";
  return "unknown";
}
