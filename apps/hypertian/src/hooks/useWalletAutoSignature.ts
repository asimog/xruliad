import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createSolanaConnection } from '@/lib/solana';

/**
 * Hook for automatically capturing and verifying Solana transaction signatures
 * from the connected wallet.
 */
export function useWalletAutoSignature(options: {
  /** Enable/disable auto-signature capture */
  enabled?: boolean;
  /** Payment ID to associate with captured signatures */
  paymentId?: string;
  /** Expected recipient address for verification */
  expectedRecipient?: string;
  /** Expected amount for verification */
  expectedAmount?: number;
  /** Callback when a signature is captured */
  onSignatureCaptured?: (signature: string) => void;
  /** Callback when a signature is verified */
  onSignatureVerified?: (signature: string, verified: boolean) => void;
} = {}) {
  const {
    enabled = true,
    paymentId,
    expectedRecipient,
    expectedAmount,
    onSignatureCaptured,
    onSignatureVerified,
  } = options;

  const { publicKey, connected } = useWallet();
  const [signatures, setSignatures] = useState<string[]>([]);
  const [verifiedSignatures, setVerifiedSignatures] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connection = createSolanaConnection();

  /**
   * Fetch recent signatures from the wallet
   */
  const fetchSignatures = useCallback(async () => {
    if (!enabled || !connected || !publicKey) return;

    try {
      const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      const newSigs = sigs
        .filter((sig) => !sig.err)
        .map((sig) => sig.signature)
        .filter((sig) => !signatures.includes(sig));

      if (newSigs.length > 0) {
        setSignatures((prev) => [...newSigs, ...prev].slice(0, 10));
        newSigs.forEach((sig) => onSignatureCaptured?.(sig));
      }
    } catch (err) {
      setError('Failed to fetch signatures');
    }
  }, [enabled, connected, publicKey, signatures, connection, onSignatureCaptured]);

  /**
   * Verify a transaction signature
   */
  const verifySignature = useCallback(async (signature: string): Promise<boolean> => {
    if (!publicKey) return false;

    setVerifying(signature);
    setError(null);

    try {
      const transaction = await connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        setError('Transaction not found');
        onSignatureVerified?.(signature, false);
        return false;
      }

      if (transaction.meta?.err) {
        setError('Transaction failed on-chain');
        onSignatureVerified?.(signature, false);
        return false;
      }

      // Verify recipient if expected
      if (expectedRecipient) {
        const accountKeys = transaction.transaction.message.accountKeys;
        const recipientIndex = accountKeys.findIndex((account) =>
          account.pubkey.equals(new PublicKey(expectedRecipient))
        );

        if (recipientIndex < 0) {
          setError('Transaction does not include expected recipient');
          onSignatureVerified?.(signature, false);
          return false;
        }

        // Verify amount if expected
        if (expectedAmount) {
          const preBalance = transaction.meta?.preBalances?.[recipientIndex] ?? 0;
          const postBalance = transaction.meta?.postBalances?.[recipientIndex] ?? 0;
          const amountReceived = Math.max(0, postBalance - preBalance) / 1_000_000_000;

          if (amountReceived + 0.000001 < expectedAmount) {
            setError(`Amount too low. Received ${amountReceived} SOL, expected ${expectedAmount} SOL`);
            onSignatureVerified?.(signature, false);
            return false;
          }
        }
      }

      setVerifiedSignatures((prev) => ({ ...prev, [signature]: true }));
      onSignatureVerified?.(signature, true);
      return true;
    } catch (err) {
      setError('Failed to verify signature');
      onSignatureVerified?.(signature, false);
      return false;
    } finally {
      setVerifying(null);
    }
  }, [publicKey, connection, expectedRecipient, expectedAmount, onSignatureVerified]);

  /**
   * Monitor wallet for new transactions
   */
  useEffect(() => {
    if (!enabled || !connected || !publicKey) {
      return;
    }

    // Initial fetch
    fetchSignatures();

    // Poll for new signatures
    const interval = setInterval(fetchSignatures, 5000);
    return () => clearInterval(interval);
  }, [enabled, connected, publicKey, fetchSignatures]);

  /**
   * Auto-verify new signatures
   */
  useEffect(() => {
    if (!enabled || signatures.length === 0) return;

    const latestSignature = signatures[0];
    if (!verifiedSignatures[latestSignature]) {
      verifySignature(latestSignature);
    }
  }, [signatures, enabled, verifiedSignatures, verifySignature]);

  return {
    signatures,
    verifiedSignatures,
    verifying,
    error,
    fetchSignatures,
    verifySignature,
    isMonitoring: enabled && connected,
  };
}
