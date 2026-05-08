"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

import {
  getPrivyAccentColor,
  getPrivyAllowedRedirectUrls,
  getPrivyAppId,
  getPrivyClientId,
  getPrivyLoginMessage,
  getPrivyLoginMethods,
  getPrivyTheme,
  getPrivyWalletChainType,
  shouldShowPrivyWalletLoginFirst,
} from "@/lib/auth/private-studio-config";

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  const appId = getPrivyAppId();
  const clientId = getPrivyClientId();

  if (!appId) {
    return <>{children}</>;
  }

  const accentColor = getPrivyAccentColor();
  const redirectUrls = getPrivyAllowedRedirectUrls();
  const config: Record<string, unknown> = {
    loginMethods: getPrivyLoginMethods(),
    appearance: {
      theme: getPrivyTheme(),
      accentColor,
      loginMessage: getPrivyLoginMessage(),
      showWalletLoginFirst: shouldShowPrivyWalletLoginFirst(),
      walletChainType: getPrivyWalletChainType(),
    },
  };
  if (redirectUrls.length > 0) {
    config.loginConfig = { redirectUrl: redirectUrls[0] };
  }

  if (clientId) {
    return (
      <PrivyProvider appId={appId} clientId={clientId} config={config}>
        {children}
      </PrivyProvider>
    );
  }

  return (
    <PrivyProvider appId={appId} config={config}>
      {children}
    </PrivyProvider>
  );
}
