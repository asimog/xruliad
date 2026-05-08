import { createHash } from "crypto";

import bs58 from "bs58";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  Keypair,
} from "@solana/web3.js";

import type { PrivySession } from "@/lib/auth/privy-server";
import { getEnv } from "@/lib/env";

export function getSolanaConnection(): Connection {
  const env = getEnv();
  if (!env.SOLANA_RPC_URL) {
    throw new Error("SOLANA_RPC_URL is required for payment verification and cNFT minting.");
  }

  return new Connection(env.SOLANA_RPC_URL, "confirmed");
}

export function getDasRpcUrl(): string {
  const env = getEnv();
  return env.SOLANA_DAS_RPC_URL ?? env.SOLANA_RPC_URL ?? "";
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function getMintBundlePriceLamports(): bigint {
  return solToLamports(getEnv().SOLANA_MINT_BUNDLE_PRICE_SOL);
}

function tryReadWalletAddress(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const address =
    (typeof record.address === "string" && record.address) ||
    (typeof record.walletAddress === "string" && record.walletAddress) ||
    null;
  const chainType =
    (typeof record.chainType === "string" && record.chainType) ||
    (typeof record.chain_type === "string" && record.chain_type) ||
    (typeof record.chain === "string" && record.chain) ||
    null;

  if (!address) {
    return null;
  }

  if (!chainType || chainType.toLowerCase().includes("sol")) {
    return address;
  }

  return null;
}

export function extractSolanaWalletFromPrivySession(
  session: PrivySession,
): string | null {
  const direct = tryReadWalletAddress(session as unknown);
  if (direct) {
    return direct;
  }

  const sessionRecord = session as unknown as Record<string, unknown>;
  const linkedAccounts = Array.isArray(sessionRecord.linkedAccounts)
    ? sessionRecord.linkedAccounts
    : Array.isArray(sessionRecord.linked_accounts)
      ? sessionRecord.linked_accounts
      : [];

  for (const account of linkedAccounts) {
    const address = tryReadWalletAddress(account);
    if (address) {
      return address;
    }
  }

  const embeddedWallets = Array.isArray(sessionRecord.wallets)
    ? sessionRecord.wallets
    : [];
  for (const wallet of embeddedWallets) {
    const address = tryReadWalletAddress(wallet);
    if (address) {
      return address;
    }
  }

  return null;
}

export function getTreasuryPaymentAddress(): string {
  const env = getEnv();
  if (!env.SOLANA_MINT_PAYMENT_ADDRESS) {
    throw new Error("SOLANA_MINT_PAYMENT_ADDRESS is required for bundled SOL mint payments.");
  }
  return env.SOLANA_MINT_PAYMENT_ADDRESS;
}

export function getMintAuthorityKeypair(): Keypair {
  const env = getEnv();
  if (!env.SOLANA_MINT_AUTHORITY_SECRET) {
    throw new Error("SOLANA_MINT_AUTHORITY_SECRET is required for cNFT minting.");
  }

  const raw = env.SOLANA_MINT_AUTHORITY_SECRET.trim();
  if (raw.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  }

  return Keypair.fromSecretKey(bs58.decode(raw));
}

// Derive a unique per-job payment address from the mint authority secret + jobId.
// Each job gets its own destination address, making cross-job signature replay
// structurally impossible — a signature that pays job-A's address cannot satisfy
// the recipient check for job-B even if the DB unique constraint were removed.
// The keypair can be re-derived at any time for treasury sweeps using the same inputs.
export function deriveJobPaymentAddress(jobId: string): string {
  const env = getEnv();
  if (!env.SOLANA_MINT_AUTHORITY_SECRET) {
    throw new Error("SOLANA_MINT_AUTHORITY_SECRET is required to derive job payment addresses.");
  }

  const raw = env.SOLANA_MINT_AUTHORITY_SECRET.trim();
  const secretBytes = raw.startsWith("[")
    ? Uint8Array.from(JSON.parse(raw) as number[])
    : bs58.decode(raw);

  const seed = createHash("sha256")
    .update(secretBytes)
    .update(":job-payment:")
    .update(jobId)
    .digest();

  return Keypair.fromSeed(seed).publicKey.toBase58();
}

function accumulateLamportsToRecipient(
  transaction: ParsedTransactionWithMeta,
  sender: string,
  recipient: string,
): bigint {
  let total = BigInt(0);
  for (const instruction of transaction.transaction.message.instructions) {
    if ("parsed" in instruction) {
      const parsedInstruction = instruction as ParsedInstruction;
      const parsed = parsedInstruction.parsed as {
        type?: string;
        info?: Record<string, unknown>;
      };
      if (parsed.type !== "transfer") {
        continue;
      }
      const source = parsed.info?.source;
      const destination = parsed.info?.destination;
      const lamports = parsed.info?.lamports;
      if (
        typeof source === "string" &&
        source === sender &&
        typeof destination === "string" &&
        destination === recipient &&
        typeof lamports === "number"
      ) {
        total += BigInt(lamports);
      }
    }
  }

  return total;
}

export async function verifySolPaymentSignature(input: {
  signature: string;
  expectedSender: string;
  expectedRecipient: string;
  minimumLamports: bigint;
}): Promise<{ paidLamports: bigint; slot: number }> {
  const connection = getSolanaConnection();
  const transaction = await connection.getParsedTransaction(input.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!transaction) {
    throw new Error("Payment transaction not found on Solana.");
  }
  if (transaction.meta?.err) {
    throw new Error("Payment transaction failed on Solana.");
  }

  // The fee payer is always the first signer (accountKeys[0]).
  // Checking the fee payer rather than scanning the full key list prevents
  // a replay where a different wallet crafts a tx that merely references
  // the expected address as a non-signing account.
  const feePayer = transaction.transaction.message.accountKeys[0];
  const feePayerAddress = feePayer?.pubkey.toBase58() ?? "";
  if (feePayerAddress !== input.expectedSender) {
    throw new Error("Submitted transaction was not sent by the connected Solana wallet.");
  }

  const paidLamports = accumulateLamportsToRecipient(
    transaction,
    input.expectedSender,
    input.expectedRecipient,
  );

  if (paidLamports < input.minimumLamports) {
    throw new Error("Submitted transaction did not pay enough SOL for the mint bundle.");
  }

  return {
    paidLamports,
    slot: transaction.slot,
  };
}

export function assertValidSolanaAddress(address: string): void {
  new PublicKey(address);
}

export function deriveAssociatedTokenAddress(mint: string, owner: string): string {
  const mintKey = new PublicKey(mint);
  const ownerKey = new PublicKey(owner);
  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

  const [ata] = PublicKey.findProgramAddressSync(
    [ownerKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  return ata.toBase58();
}

export type SplTokenTransferVerification = {
  paidRawAmount: bigint;
  mint: string;
  decimals: number;
  slot: number;
  recipient: string;
  sender: string;
};

export async function verifySplTokenTransfer(input: {
  signature: string;
  expectedSender: string;
  expectedMint: string;
  expectedRecipientAta: string;
  minimumRawAmount: bigint;
  expectedDecimals: number;
}): Promise<SplTokenTransferVerification> {
  const connection = getSolanaConnection();
  const transaction = await connection.getParsedTransaction(input.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!transaction) {
    throw new Error("SPL token transfer transaction not found on Solana.");
  }
  if (transaction.meta?.err) {
    throw new Error("SPL token transfer transaction failed on Solana.");
  }

  const feePayer = transaction.transaction.message.accountKeys[0];
  const feePayerAddress = feePayer?.pubkey.toBase58() ?? "";
  if (feePayerAddress !== input.expectedSender) {
    throw new Error("Submitted transaction was not signed by the expected sender wallet.");
  }

  let foundTransfer = false;
  let paidRawAmount = BigInt(0);
  let transferMint = "";
  let transferDecimals = 0;
  let transferDestination = "";

  for (const instruction of transaction.transaction.message.instructions) {
    if ("parsed" in instruction) {
      const parsed = (instruction as { parsed: {
        type?: string; info?: Record<string, unknown>;
      } }).parsed;
      if (parsed?.type === "transferChecked" || parsed?.type === "transfer") {
        const info = parsed.info ?? {};
        const mint = typeof info.mint === "string" ? info.mint : "";
        const source = typeof info.source === "string" ? info.source : (typeof info.authority === "string" ? info.authority : "");
        const destination = typeof info.destination === "string" ? info.destination : "";
        const amount = typeof info.tokenAmount === "object" && info.tokenAmount !== null
          ? (info.tokenAmount as { amount: string }).amount
          : typeof info.amount === "string" ? info.amount : "0";
        const decimals = typeof info.tokenAmount === "object" && info.tokenAmount !== null
          ? (info.tokenAmount as { decimals: number }).decimals
          : 0;

        if (destination === input.expectedRecipientAta && mint === input.expectedMint) {
          foundTransfer = true;
          paidRawAmount = BigInt(amount);
          transferMint = mint;
          transferDecimals = decimals;
          transferDestination = destination;
        }
      }
    }
  }

  if (!foundTransfer) {
    throw new Error("No SPL token transfer to the expected recipient ATA found in this transaction.");
  }

  if (paidRawAmount < input.minimumRawAmount) {
    throw new Error(
      `SPL token payment too low: received ${paidRawAmount}, need at least ${input.minimumRawAmount}.`,
    );
  }

  if (transferDecimals !== input.expectedDecimals) {
    throw new Error(
      `SPL token decimals mismatch: expected ${input.expectedDecimals}, got ${transferDecimals}.`,
    );
  }

  return {
    paidRawAmount,
    mint: transferMint,
    decimals: transferDecimals,
    slot: transaction.slot,
    recipient: transferDestination,
    sender: input.expectedSender,
  };
}
