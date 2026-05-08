import 'server-only';
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import { getSolanaRpcUrl } from '@/lib/env';
import { AssetKind } from '@/lib/types';
import { decryptSecret, encryptSecret } from '@/lib/secrets';

const LAMPORTS_PER_SOL = 1_000_000_000;

export function createSolanaConnection() {
  return new Connection(getSolanaRpcUrl(), 'confirmed');
}

export function generateSolanaDepositAccount() {
  const keypair = Keypair.generate();

  return {
    address: keypair.publicKey.toBase58(),
    secret: encryptSecret(JSON.stringify(Array.from(keypair.secretKey))),
  };
}

function keypairFromEncryptedSecret(secret: string) {
  const decoded = decryptSecret(secret);
  const values = JSON.parse(decoded) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(values));
}

export async function getSolanaDepositPaymentStatus(input: {
  depositAddress: string;
  amount: number;
  currency: AssetKind;
}) {
  if (input.currency !== 'SOL') {
    throw new Error('Generated deposit addresses currently support SOL payments only.');
  }

  const connection = createSolanaConnection();
  const address = new PublicKey(input.depositAddress);
  const [lamports, signatures] = await Promise.all([
    connection.getBalance(address, 'confirmed'),
    connection.getSignaturesForAddress(address, { limit: 10 }, 'confirmed'),
  ]);

  const amountReceived = lamports / LAMPORTS_PER_SOL;
  const matchingSignature = signatures.find((entry) => !entry.err)?.signature || null;

  return {
    verified: amountReceived + 0.000001 >= input.amount,
    amountReceived,
    txHash: matchingSignature,
  };
}

export async function verifyDirectSolPayment(input: {
  signature: string;
  recipient: string;
  amount: number;
  minBlockTime?: number | null;
}) {
  const connection = createSolanaConnection();
  const recipient = new PublicKey(input.recipient);
  const transaction = await connection.getParsedTransaction(input.signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction was not found or is not confirmed.',
    };
  }

  if (transaction.meta?.err) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction failed on-chain.',
    };
  }

  if (input.minBlockTime && transaction.blockTime && transaction.blockTime < input.minBlockTime) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction is older than the ad checkout.',
    };
  }

  const accountKeys = transaction.transaction.message.accountKeys;
  const recipientIndex = accountKeys.findIndex((account) => account.pubkey.equals(recipient));
  if (recipientIndex < 0) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction does not include the payout wallet.',
    };
  }

  const preBalance = transaction.meta?.preBalances?.[recipientIndex] ?? 0;
  const postBalance = transaction.meta?.postBalances?.[recipientIndex] ?? 0;
  const amountReceived = Math.max(0, postBalance - preBalance) / LAMPORTS_PER_SOL;

  return {
    verified: amountReceived + 0.000001 >= input.amount,
    amountReceived,
    reason:
      amountReceived + 0.000001 >= input.amount
        ? null
        : `Payment amount is too low. Received ${amountReceived.toFixed(9)} SOL.`,
  };
}

export async function sweepEscrowBalance(input: {
  depositAddress: string;
  encryptedSecret: string;
  streamerWallet: string;
  platformTreasuryWallet?: string | null;
  expectedStreamerAmount: number;
  expectedPlatformFeeAmount?: number | null;
}) {
  const connection = createSolanaConnection();
  const source = keypairFromEncryptedSecret(input.encryptedSecret);
  const sourceAddress = new PublicKey(input.depositAddress);
  const streamerWallet = new PublicKey(input.streamerWallet);
  const treasuryWallet = input.platformTreasuryWallet ? new PublicKey(input.platformTreasuryWallet) : null;
  const currentBalance = await connection.getBalance(sourceAddress, 'confirmed');

  if (currentBalance <= 0) {
    return {
      swept: false as const,
      reason: 'Escrow balance is empty.',
      txHash: null,
    };
  }

  const transaction = new Transaction({ feePayer: source.publicKey });
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

  const expectedPlatformLamports = Math.max(0, Math.round((input.expectedPlatformFeeAmount ?? 0) * LAMPORTS_PER_SOL));
  const expectedStreamerLamports = Math.max(0, Math.round(input.expectedStreamerAmount * LAMPORTS_PER_SOL));

  const dryRun = new Transaction({ feePayer: source.publicKey });
  dryRun.recentBlockhash = transaction.recentBlockhash;
  dryRun.add(SystemProgram.transfer({ fromPubkey: source.publicKey, toPubkey: streamerWallet, lamports: 1 }));
  if (treasuryWallet && expectedPlatformLamports > 0) {
    dryRun.add(SystemProgram.transfer({ fromPubkey: source.publicKey, toPubkey: treasuryWallet, lamports: 1 }));
  }

  const fee = await dryRun.getEstimatedFee(connection);
  const availableAfterFee = currentBalance - (fee ?? 5_000);

  if (availableAfterFee <= 0) {
    return {
      swept: false as const,
      reason: 'Escrow balance does not cover network fees.',
      txHash: null,
    };
  }

  const platformLamports = treasuryWallet ? Math.min(expectedPlatformLamports, availableAfterFee) : 0;
  const streamerLamports = Math.max(0, Math.min(expectedStreamerLamports, availableAfterFee - platformLamports));
  const remainderLamports = Math.max(0, availableAfterFee - platformLamports - streamerLamports);
  const finalStreamerLamports = streamerLamports + remainderLamports;

  if (finalStreamerLamports > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: source.publicKey,
        toPubkey: streamerWallet,
        lamports: finalStreamerLamports,
      }),
    );
  }

  if (treasuryWallet && platformLamports > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: source.publicKey,
        toPubkey: treasuryWallet,
        lamports: platformLamports,
      }),
    );
  }

  if (transaction.instructions.length === 0) {
    return {
      swept: false as const,
      reason: 'No sweep instructions were generated.',
      txHash: null,
    };
  }

  const txHash = await sendAndConfirmTransaction(connection, transaction, [source], {
    commitment: 'confirmed',
  });

  return {
    swept: true as const,
    txHash,
    sweptStreamerAmount: finalStreamerLamports / LAMPORTS_PER_SOL,
    sweptPlatformAmount: platformLamports / LAMPORTS_PER_SOL,
  };
}

// Auto-trigger payment verification when balance is detected
export async function autoTriggerAndSweepPayment(input: {
  paymentId: string;
  depositAddress: string;
  encryptedSecret: string;
  streamerWallet: string;
  platformTreasuryWallet?: string | null;
  expectedAmount: number;
  expectedPlatformFee?: number | null;
}) {
  const connection = createSolanaConnection();
  const address = new PublicKey(input.depositAddress);

  // Check balance
  const lamports = await connection.getBalance(address, 'confirmed');
  const amountReceived = lamports / LAMPORTS_PER_SOL;

  if (amountReceived < input.expectedAmount - 0.000001) {
    return {
      triggered: false,
      reason: `Insufficient balance: ${amountReceived} SOL < ${input.expectedAmount} SOL`,
      amountReceived,
    };
  }

  // Get transaction signatures to find the payment
  const signatures = await connection.getSignaturesForAddress(address, { limit: 10 }, 'confirmed');
  const paymentSig = signatures.find((sig) => !sig.err)?.signature;

  if (!paymentSig) {
    return {
      triggered: false,
      reason: 'No valid payment transaction found.',
      amountReceived,
    };
  }

  // Sweep the funds
  const sweepResult = await sweepEscrowBalance({
    depositAddress: input.depositAddress,
    encryptedSecret: input.encryptedSecret,
    streamerWallet: input.streamerWallet,
    platformTreasuryWallet: input.platformTreasuryWallet,
    expectedStreamerAmount: amountReceived,
    expectedPlatformFeeAmount: input.expectedPlatformFee,
  });

  return {
    triggered: true,
    txHash: paymentSig,
    sweepResult,
    amountReceived,
  };
}
