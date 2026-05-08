'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdRecord, StreamPlatform, StreamRecord } from '@/lib/types';

export type AdminStreamRow = StreamRecord;
export type AdminAdRow = AdRecord & {
  streams?: { id: string; display_name: string | null; platform: StreamPlatform } | null;
  payments?: { id: string; amount: number; currency: string; status: string }[];
};
export type AdminFeedbackRow = {
  id: string;
  category: string;
  message: string;
  email: string | null;
  context_url: string | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
};

type Props = {
  initialStreams: AdminStreamRow[];
  initialAds: AdminAdRow[];
  initialFeedback: AdminFeedbackRow[];
};

type Tab = 'feedback' | 'jobs' | 'streams';

export function AdminDashboard({ initialStreams, initialAds, initialFeedback }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('feedback');
  const [streams, setStreams] = useState(initialStreams);
  const [ads, setAds] = useState(initialAds);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/admin/data', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { streams?: AdminStreamRow[]; ads?: AdminAdRow[]; feedback?: AdminFeedbackRow[] };
      if (data.streams) setStreams(data.streams);
      if (data.ads) setAds(data.ads);
      if (data.feedback) setFeedback(data.feedback);
    } catch {
      // ignore
    }
  }

  async function action(payload: Record<string, unknown>, busyKey: string) {
    setBusyId(busyKey);
    setError(null);
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Action failed.');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  const openFeedback = feedback.filter((f) => f.status === 'open');

  return (
    <div className="grid gap-5">
      <div className="soft-card p-6 text-center">
        <p className="text-2xl font-bold text-white">THERE IS NO ADMIN</p>
        <p className="mt-2 text-xl text-[var(--color-accent)]">I LOVE YOU</p>
        <p className="mt-4 text-lg text-[var(--color-copy-soft)]">I HOPE I NEVER HAVE TO USE THIS</p>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Admin</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Moderation</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="pill">{openFeedback.length} open feedback</span>
          <span className="pill">{ads.length} ads</span>
          <span className="pill">{streams.length} streams</span>
          <button className="secondary-button" onClick={() => void logout()} type="button">Sign out</button>
        </div>
      </header>

      <nav aria-label="Admin sections" className="flex gap-2">
        {(['feedback', 'jobs', 'streams'] as Tab[]).map((t) => (
          <button
            aria-current={tab === t ? 'page' : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
              tab === t
                ? 'border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] text-white'
                : 'border-white/10 bg-white/[0.03] text-[var(--color-copy-soft)] hover:border-white/20 hover:text-white'
            }`}
            key={t}
            onClick={() => setTab(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </nav>

      {error ? <div className="status-note" data-tone="danger">{error}</div> : null}

      {tab === 'feedback' ? (
        <div className="grid gap-3">
          {feedback.length === 0 ? <div className="status-note">No feedback yet.</div> : null}
          {feedback.map((f) => (
            <article className="panel rounded-3xl p-4" key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">
                    {f.category} · {new Date(f.created_at).toLocaleString()}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-copy)]">{f.message}</p>
                  {f.email || f.context_url ? (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-copy-soft)]">
                      {f.email ? <span>{f.email}</span> : null}
                      {f.context_url ? (
                        <a className="text-[var(--color-accent)] underline" href={f.context_url} rel="noreferrer" target="_blank">
                          context
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                    f.status === 'resolved'
                      ? 'border-white/10 bg-white/[0.04] text-[var(--color-copy-faint)]'
                      : 'border-amber-300/30 bg-amber-300/10 text-amber-100'
                  }`}>{f.status}</span>
                  <button
                    className="secondary-button"
                    disabled={busyId === f.id}
                    onClick={() =>
                      void action(
                        { action: 'resolve-feedback', id: f.id, status: f.status === 'resolved' ? 'open' : 'resolved' },
                        f.id,
                      )
                    }
                    type="button"
                  >
                    {f.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'jobs' ? (
        <div className="grid gap-2">
          {ads.length === 0 ? <div className="status-note">No ads yet.</div> : null}
          {ads.map((ad) => (
            <article className="panel rounded-2xl p-4" key={ad.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">
                    {ad.id.slice(0, 8)} · {ad.ad_type} · {ad.status}
                  </div>
                  <div className="mt-1 text-sm text-white">
                    {ad.streams?.display_name || ad.streams?.platform || 'unknown stream'}
                  </div>
                  <div className="mt-1 break-all text-xs text-[var(--color-copy-soft)]">
                    token: {ad.token_address || '—'} · banner: {ad.banner_url || '—'}
                  </div>
                </div>
                <button
                  className="secondary-button"
                  disabled={busyId === ad.id}
                  onClick={() => void action({ action: 'hide-ad', adId: ad.id, hidden: !ad.is_hidden }, ad.id)}
                  type="button"
                >
                  {ad.is_hidden ? 'Unhide' : 'Hide from feed'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'streams' ? (
        <div className="grid gap-2">
          {streams.length === 0 ? <div className="status-note">No streams yet.</div> : null}
          {streams.map((stream) => (
            <article className="panel rounded-2xl p-4" key={stream.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">
                    {stream.id.slice(0, 8)} · {stream.platform}
                  </div>
                  <div className="mt-1 text-sm text-white">{stream.display_name || '—'}</div>
                  <div className="mt-1 text-xs text-[var(--color-copy-soft)]">
                    last heartbeat: {stream.last_heartbeat ? new Date(stream.last_heartbeat).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="secondary-button"
                    disabled={busyId === stream.id}
                    onClick={() => void action({ action: 'trigger-heartbeat', streamId: stream.id }, stream.id)}
                    type="button"
                  >
                    Force heartbeat
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busyId === stream.id}
                    onClick={() => void action({ action: 'hide-stream', streamId: stream.id, hidden: !stream.is_hidden }, stream.id)}
                    type="button"
                  >
                    {stream.is_hidden ? 'Unhide' : 'Hide from directory'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
