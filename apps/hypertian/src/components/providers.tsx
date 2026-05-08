'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { ReactNode } from 'react';
import { getPublicEnv, isPrivyEnabled, isSupabaseEnabled } from '@/lib/env';
import { SupabaseProvider } from '@/components/SupabaseProvider';
import { createClient } from '@/lib/supabase/client';

export function Providers({ children }: { children: ReactNode }) {
  const env = getPublicEnv();
  const supabaseClient = isSupabaseEnabled() ? createClient() : null;
  const content = supabaseClient ? <SupabaseProvider supabaseClient={supabaseClient}>{children}</SupabaseProvider> : children;

  if (!isPrivyEnabled() || !env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return content;
  }

  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'twitter'],
        appearance: {
          accentColor: '#7ce4d2',
          walletChainType: 'ethereum-and-solana',
          theme: 'dark',
          landingHeader: 'Hypertian',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
      }}
    >
      {content}
    </PrivyProvider>
  );
}
