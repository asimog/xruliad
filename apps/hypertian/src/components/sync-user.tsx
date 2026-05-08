'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useRef } from 'react';
import { UserRole } from '@/lib/types';

export function SyncUser({ role }: { role: UserRole }) {
  const { authenticated, ready, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const hasSynced = useRef(false);

  useEffect(() => {
    async function sync() {
      if (!ready || !authenticated || !user || hasSynced.current) {
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const walletAddress = wallets.find((wallet) => wallet.address)?.address || null;
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          walletAddress,
        }),
      });

      if (response.ok) {
        hasSynced.current = true;
      }
    }

    void sync();
  }, [authenticated, getAccessToken, ready, role, user, wallets]);

  return null;
}
