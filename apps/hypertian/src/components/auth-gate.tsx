'use client';

import { usePrivy } from '@privy-io/react-auth';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { ReactNode } from 'react';
import { SyncUser } from '@/components/sync-user';
import { isPrivyEnabled } from '@/lib/env';
import { UserRole } from '@/lib/types';

function PrivyAuthGate({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { authenticated, login, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="panel mx-auto flex min-h-[40vh] max-w-2xl items-center justify-center rounded-[32px] p-8 text-[var(--color-copy-soft)] shadow-[0_28px_80px_rgba(6,16,19,0.5)]">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-[var(--color-accent)]" />
        Checking your account...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="panel mx-auto max-w-2xl rounded-[32px] p-8 text-center shadow-[0_28px_80px_rgba(6,16,19,0.5)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <LockKeyhole className="h-7 w-7 text-[var(--color-accent)]" />
        </div>
        <h2 className="text-2xl font-semibold text-white">{role === 'streamer' ? 'Creator' : 'Sponsor'} login required</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
          Sign in to manage inventory, approvals, and campaign activity.
        </p>
        <button
          className="primary-button mt-6"
          onClick={login}
          type="button"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <>
      <SyncUser role={role} />
      {children}
    </>
  );
}

export function AuthGate(props: { role: UserRole; children: ReactNode }) {
  if (!isPrivyEnabled()) {
    return <>{props.children}</>;
  }

  return <PrivyAuthGate {...props} />;
}
