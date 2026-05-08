"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";

export function PrivyProtected({ children }: { children: ReactNode }) {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <div className="ux-result-card" role="status" aria-live="polite">
        <p>Loading your private studio session...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="ux-error-card">
        <p>Sign in to unlock private trailers, image cuts, and prompt-led films.</p>
        <div className="ux-actions">
          <button
            type="button"
            className="ux-btn ux-btn--primary"
            onClick={() => void login()}
          >
            Sign In
          </button>
          <Link href="/login" className="ux-btn">
            View profile
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
