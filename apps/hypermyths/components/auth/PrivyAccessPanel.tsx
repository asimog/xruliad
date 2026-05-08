"use client";

import { usePrivy } from "@privy-io/react-auth";

function describeUser(user: unknown): string {
  if (!user || typeof user !== "object") {
    return "creator";
  }

  const record = user as Record<string, unknown>;
  const email = record.email;
  if (email && typeof email === "object") {
    const address = (email as Record<string, unknown>).address;
    if (typeof address === "string" && address.length > 0) {
      return address;
    }
  }

  const wallet = record.wallet;
  if (wallet && typeof wallet === "object") {
    const address = (wallet as Record<string, unknown>).address;
    if (typeof address === "string" && address.length > 0) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
  }

  return "creator";
}

export function PrivyAccessPanel() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const userLabel = describeUser(user);

  if (!ready) {
    return (
      <div className="ux-result-card" role="status" aria-live="polite">
        <p>Loading your creator profile...</p>
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="ux-result-card" role="status" aria-live="polite">
        <p>
          Welcome back, <strong>{userLabel}</strong>!
        </p>
        <div className="ux-actions">
          <button type="button" className="ux-btn ux-btn--primary" onClick={() => void logout()}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="ux-result-card">
        <p>Sign in to access private trailers, premium prompts, and collectible releases.</p>
        <div className="ux-actions">
          <button type="button" className="ux-btn ux-btn--primary" onClick={() => void login()}>
            Sign In to Premium Studio
          </button>
        </div>
      </div>
  );
}
