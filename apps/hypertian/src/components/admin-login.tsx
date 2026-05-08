'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-sm gap-3">
      <header className="grid gap-1">
        <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Admin</div>
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <p className="text-xs text-[var(--color-copy-soft)]">Enter the admin password to moderate job cards and feedback.</p>
      </header>
      <div className="panel rounded-3xl p-5">
        <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
          Password
          <input
            autoFocus
            className="field"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            type="password"
            value={password}
          />
        </label>
        {error ? <div className="status-note mt-3" data-tone="danger">{error}</div> : null}
        <button className="primary-button mt-4 w-full justify-center" disabled={submitting || !password} onClick={() => void submit()} type="button">
          {submitting ? 'Checking…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
