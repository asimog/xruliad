declare module "@privy-io/react-auth" {
  import type { ComponentType, ReactNode } from "react";

  export const PrivyProvider: ComponentType<{
    appId: string;
    clientId?: string;
    config?: unknown;
    children: ReactNode;
  }>;

  export function usePrivy(): {
    ready: boolean;
    authenticated: boolean;
    user?: unknown;
    getAccessToken(): Promise<string | null>;
    login(): Promise<void> | void;
    logout(): Promise<void> | void;
  };

  export function getAccessToken(): Promise<string | null>;
}
