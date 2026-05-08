'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { FeedJobCard } from '@/lib/supabase/anon-queries';
import { STREAM_PLATFORM_NAMES } from '@/lib/constants';

const REFRESH_MS = 30_000;

type Props = { initialItems: FeedJobCard[] };

const STATUS_TONE: Record<string, string> = {
  active: 'border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] text-white',
  pending_payment: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  pending_streamer_approval: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
  rejected: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
  expired: 'border-white/10 bg-white/[0.04] text-[var(--color-copy-faint)]',
};

export function FeedView({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch('/api/public/feed', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: FeedJobCard[] };
        if (!cancelled && data.items) {
          setItems(data.items);
          setRefreshedAt(Date.now());
        }
      } catch {
        // ignore
      }
    }
    const handle = window.setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, []);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Feed</div>
          <h1 className="mt-1 text-3xl font-semibold text-white">Transparent job cards</h1>
          <p className="mt-1 text-sm text-[var(--color-copy-soft)]">Every ad + payment that flows through Hypertian. Refreshes every 30s.</p>
        </div>
        <div className="text-xs text-[var(--color-copy-faint)]">{items.length} cards · refreshed {timeAgo(refreshedAt)}</div>
      </header>

       {!items.length ? (
        <div className="soft-card text-sm text-[var(--color-copy-soft)]">
          No job cards yet. They appear here the moment someone requests an ad on the Directory.
        </div>
      ) : null}

       <div className="grid gap-2">
        {items.map((item) => {
          const status = item.ad.status || 'pending_payment';
          const tone = STATUS_TONE[status] || STATUS_TONE.pending_payment;
          const totalPaid = item.payments
            .filter((p) => p.status === 'verified')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);
           return (
             <article
               className="panel rounded-2xl p-4 transition-all duration-200 hover:border-[rgba(124,228,210,0.3)] hover:bg-[rgba(124,228,210,0.08)]"
               key={item.ad.id}
             >
                 <div className="flex flex-wrap items-start justify-between gap-2">
                   <div className="min-w-0">
                     <div className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">
                       Job · <Link href={`/jobs/${item.ad.id}`} className="text-[var(--color-copy-soft)] hover:text-white hover:underline">{item.ad.id.slice(0, 8)}</Link>
                     </div>
                     <div className="mt-0.5 text-sm font-semibold text-white">
                       <Link href={`/jobs/${item.ad.id}`} className="hover:underline">
                         {item.ad.ad_type === 'banner' ? 'Media banner' : 'Token chart'}
                         {item.stream ? ` → ${item.stream.display_name || STREAM_PLATFORM_NAMES[item.stream.platform]}` : ''}
                       </Link>
                     </div>
                     <div className="mt-0.5 text-[10px] text-[var(--color-copy-soft)]">
                       {item.ad.position} · {item.ad.size} · {item.ad.duration_minutes ?? 5} min
                     </div>
                   </div>
                   <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] ${tone}`}>
                     {status.replace(/_/g, ' ')}
                   </span>
                 </div>

                 <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                   <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                     <dt className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Token</dt>
                     <dd className="mt-0.5 break-all font-mono text-[10px] text-[var(--color-copy)]">
                       {item.ad.ad_type === 'chart' ? item.ad.token_address || '—' : '—'}
                     </dd>
                   </div>
                   <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                     <dt className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Banner</dt>
                     <dd className="mt-0.5 truncate text-[10px] text-[var(--color-copy)]">
                       {item.ad.banner_url ? (
                         <a className="inline-flex items-center gap-1 text-[var(--color-accent)] underline" href={item.ad.banner_url} rel="noreferrer" target="_blank">
                           view
                         </a>
                       ) : (
                         '—'
                       )}
                     </dd>
                   </div>
                   <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                     <dt className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Paid</dt>
                     <dd className="mt-0.5 text-[10px] text-[var(--color-copy)]">{totalPaid > 0 ? `${totalPaid} SOL` : '—'}</dd>
                   </div>
                 </dl>

                 {item.payments.length ? (
                   <ul className="mt-2 grid gap-1 text-[10px] text-[var(--color-copy-soft)]">
                     {item.payments.map((p) => (
                       <li key={p.id} className="flex flex-wrap items-center justify-between gap-1 rounded-xl border border-white/5 bg-white/[0.02] px-2 py-1">
                         <span className="font-mono text-[9px] text-[var(--color-copy-faint)]">payment · {p.id.slice(0, 8)}</span>
                         <span>{p.amount} {p.currency}</span>
                         <span className="uppercase tracking-[0.18em] text-[9px]">{p.status}</span>
                         {p.tx_hash ? (
                           <a className="font-mono text-[9px] text-[var(--color-accent)] underline" href={`https://solscan.io/tx/${p.tx_hash}`} rel="noreferrer" target="_blank">
                             {p.tx_hash.slice(0, 8)}…
                           </a>
                         ) : null}
                       </li>
                     ))}
                   </ul>
                 ) : null}
               </article>
           );
         })}
       </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}
