"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

import { UnifiedRouteShell } from "@/components/shell/UnifiedRouteShell";
import {
  getPrivyLoginMethods,
  isPrivyConfigured,
} from "@/lib/auth/private-studio-config";

function describeUser(user: unknown): { title: string; detail: string | null } {
  if (!user || typeof user !== "object") {
    return { title: "Guest", detail: null };
  }

  const record = user as Record<string, unknown>;
  const email = record.email;
  if (email && typeof email === "object") {
    const address = (email as Record<string, unknown>).address;
    if (typeof address === "string" && address.length > 0) {
      return { title: address, detail: "Signed in with email" };
    }
  }

  const wallet = record.wallet;
  if (wallet && typeof wallet === "object") {
    const address = (wallet as Record<string, unknown>).address;
    if (typeof address === "string" && address.length > 0) {
      return {
        title: `${address.slice(0, 6)}...${address.slice(-4)}`,
        detail: "Signed in with wallet",
      };
    }
  }

  return { title: "Creator account", detail: null };
}

function ProfilePageInner() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const loginMethods = getPrivyLoginMethods();
  const userSummary = describeUser(user);

  return (
    <UnifiedRouteShell
      eyebrow="PROFILE"
      title="Profile"
      subtitle="Manage private trailers, collections, and Creator Studio access."
    >
      <div className="ux-stack">
        {!isPrivyConfigured() ? (
          <div className="ux-error-card">
            Sign-in is currently unavailable. Please check back soon.
          </div>
        ) : null}

        <div className="ux-result-card">
          <p>
            <strong>Session:</strong>{" "}
            {!ready
              ? "Loading session..."
              : authenticated
                ? userSummary.title
                : "Not signed in"}
          </p>
          {ready && authenticated && userSummary.detail ? (
            <p>{userSummary.detail}</p>
          ) : null}
          {!ready ? null : authenticated ? (
            <div className="ux-actions">
              <Link href="/creator" className="ux-btn ux-btn--primary">
                Open Creator Studio
              </Link>
              <button
                type="button"
                className="ux-btn"
                onClick={() => void logout()}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ux-actions">
              <button
                type="button"
                className="ux-btn ux-btn--primary"
                onClick={() => void login()}
                disabled={!isPrivyConfigured()}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        <div className="ux-result-card">
          <p>
            <Link href="/media">Trailer Studio</Link> — free public trailers, no login required.
          </p>
          <p>
            <Link href="/creator">Creator Studio</Link> — private trailers, prompts, wallet recaps, and image cuts.
          </p>
        </div>

        <div className="ux-result-card">
          <p>
            Available sign-in methods: <strong>{loginMethods.join(", ")}</strong>
          </p>
        </div>

        <div className="ux-result-card">
          <p>Private trailers stay off the public feed. Turn finished cuts into Solana collectibles when you are ready.</p>
        </div>
      </div>
    </UnifiedRouteShell>
  );
}

export default function LoginPage() {
  return <ProfilePageInner />;
}
