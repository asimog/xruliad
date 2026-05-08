'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createSolanaConnection } from '@/lib/solana';
import { CopyButton } from './copy-button';

interface WalletAutoSignatureProps {
  /** The payment ID to associate with the captured signature */
  paymentId?: string;
  /** Callback when a signature is captured */
  onSignatureCaptured?: (signature: string) => void;
  /** Whether to auto-verify the signature */
  autoVerify?: boolean;
  /** The expected recipient address for verification */
  expectedRecipient?: string;
  /** The expected amount for verification */
  expectedAmount?: number;
  /** Additional class names */
  className?: string;
}

/**
 * WalletAutoSignature - Captures and verifies Solana transaction signatures
 * from the connected wallet automatically.
 * 
 * This component monitors the connected wallet for recent transactions
 * and automatically captures signatures that match expected criteria.
 * It integrates with @solana/wallet-adapter-react for wallet connectivity.
 */
export function WalletAutoSignature({
  paymentId,
  onSignatureCaptured,
  autoVerify = false,
  expectedRecipient,
  expectedAmount,
  className = '',
}: WalletAutoSignatureProps) {
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const [recentSignatures, setRecentSignatures] = useState<string[]>([]);
  const [verifyingSignature, setVerifyingSignature] = useState<string | null>(null);
  const [verifiedSignatures, setVerifiedSignatures] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const connection = createSolanaConnection();

  /**
   * Fetch recent signatures for the connected wallet
   */
  const fetchRecentSignatures = useCallback(async () => {
    if (!publicKey) return;

    try {
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      const newSignatures = signatures
        .filter((sig) => !sig.err)
        .map((sig) => sig.signature)
        .filter((sig) => !recentSignatures.includes(sig));

      if (newSignatures.length > 0) {
        setRecentSignatures((prev) => [...newSignatures, ...prev].slice(0, 10));
        
        // Notify about new signatures
        for (const sig of newSignatures) {
          onSignatureCaptured?.(sig);
        }
      }
    } catch (err) {
      setError('Failed to fetch signatures');
    }
  }, [publicKey, connection, recentSignatures, onSignatureCaptured]);

  /**
   * Verify a transaction signature
   */
  const verifySignature = useCallback(async (signature: string) => {
    if (!publicKey) return false;

    setVerifyingSignature(signature);
    setError(null);

    try {
      const transaction = await connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        setError('Transaction not found');
        return false;
      }

      if (transaction.meta?.err) {
        setError('Transaction failed on-chain');
        return false;
      }

      // Check if the transaction involves the expected recipient
      if (expectedRecipient) {
        const accountKeys = transaction.transaction.message.accountKeys;
        const recipientIndex = accountKeys.findIndex((account) => 
          account.pubkey.equals(new PublicKey(expectedRecipient))
        );

        if (recipientIndex < 0) {
          setError('Transaction does not include expected recipient');
          return false;
        }

        // Check amount if expected
        if (expectedAmount) {
          const preBalance = transaction.meta?.preBalances?.[recipientIndex] ?? 0;
          const postBalance = transaction.meta?.postBalances?.[recipientIndex] ?? 0;
          const amountReceived = Math.max(0, postBalance - preBalance) / 1_000_000_000;

          if (amountReceived + 0.000001 < expectedAmount) {
            setError(`Amount too low. Received ${amountReceived} SOL, expected ${expectedAmount} SOL`);
            return false;
          }
        }
      }

      setVerifiedSignatures((prev) => ({ ...prev, [signature]: true }));
      return true;
    } catch (err) {
      setError('Failed to verify signature');
      return false;
    } finally {
      setVerifyingSignature(null);
    }
  }, [publicKey, connection, expectedRecipient, expectedAmount]);

  /**
   * Monitor wallet for new transactions
   */
  useEffect(() => {
    if (!connected || !publicKey) {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);
    setError(null);
    
    // Initial fetch
    fetchRecentSignatures();

    // Poll for new signatures every 5 seconds
    const interval = setInterval(fetchRecentSignatures, 5000);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [connected, publicKey, fetchRecentSignatures]);

  /**
   * Auto-verify new signatures if enabled
   */
  useEffect(() => {
    if (!autoVerify || recentSignatures.length === 0) return;

    const latestSignature = recentSignatures[0];
    if (!verifiedSignatures[latestSignature]) {
      verifySignature(latestSignature);
    }
  }, [recentSignatures, autoVerify, verifiedSignatures, verifySignature]);

  if (!connected || !publicKey) {
    return (
      <div className={`soft-card ${className}`}>
        <div className="text-sm text-[var(--color-copy-soft)]">
          Connect your wallet to capture signatures
        </div>
      </div>
    );
  }

  return (
    <div className={`soft-card ${className}`}>
      <div className="section-kicker text-[var(--color-accent)] mb-3">Wallet Signatures</div>
      
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-sm text-[var(--color-copy-soft)]">
          {isMonitoring ? 'Monitoring for new transactions' : 'Wallet connected'}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {paymentId && (
        <div className="mb-4 text-xs text-[var(--color-copy-faint)]">
          Payment ID: {paymentId}
        </div>
      )}

      {expectedRecipient && (
        <div className="mb-4 text-sm">
          <span className="text-[var(--color-copy-soft)]">Expected recipient: </span>
          <span className="font-mono text-[var(--color-accent)]">
            {expectedRecipient.slice(0, 8)}...{expectedRecipient.slice(-4)}
          </span>
        </div>
      )}

      {expectedAmount && (
        <div className="mb-4 text-sm">
          <span className="text-[var(--color-copy-soft)]">Expected amount: </span>
          <span className="font-mono text-[var(--color-accent)]">{expectedAmount} SOL</span>
        </div>
      )}

      <div className="max-h-60 overflow-y-auto">
        {recentSignatures.length === 0 ? (
          <div className="text-sm text-[var(--color-copy-soft)]">
            No recent signatures found. Make a transaction to capture its signature.
          </div>
        ) : (
          <div className="space-y-2">
            {recentSignatures.map((signature, index) => (
              <div
                key={signature}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-[var(--color-accent)]">
                      {signature.slice(0, 16)}...{signature.slice(-8)}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--color-copy-faint)]">
                      {index === 0 && isMonitoring ? 'Latest' : `#${index + 1}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {verifyingSignature === signature ? (
                      <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
                    ) : verifiedSignatures[signature] ? (
                      <span className="text-xs text-emerald-400">✓ Verified</span>
                    ) : (
                      <button
                        className="text-xs text-[var(--color-copy-soft)] underline underline-offset-2 hover:text-white"
                        onClick={() => verifySignature(signature)}
                        type="button"
                      >
                        Verify
                      </button>
                    )}
                    <CopyButton
                      className="secondary-button h-6 px-2 text-[10px]"
                      label="Copy signature"
                      value={signature}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 text-[10px] text-[var(--color-copy-faint)]">
        Signatures are fetched every 5 seconds. Use the Verify button to check transaction details.
      </div>
    </div>
  );
}
