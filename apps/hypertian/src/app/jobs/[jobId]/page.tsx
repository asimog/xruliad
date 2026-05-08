import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getPublicFeedItem } from '@/lib/supabase/anon-queries';
import { STREAM_PLATFORM_NAMES } from '@/lib/constants';

interface Props {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const item = await getPublicFeedItem(jobId);

  if (!item) {
    return {
      title: 'Job Not Found',
    };
  }

  const title = `Job ${item.ad.id.slice(0, 8)} — ${item.ad.ad_type === 'banner' ? 'Media banner' : 'Token chart'}`;

  return {
    title,
    description: `View details for Hypertian ad job ${item.ad.id.slice(0, 8)}. Type: ${item.ad.ad_type}, Position: ${item.ad.position}, Status: ${item.ad.status}`,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { jobId } = await params;
  const item = await getPublicFeedItem(jobId);

  if (!item) {
    notFound();
  }

  const status = item.ad.status || 'pending_payment';
  const totalPaid = item.payments
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const statusColors: Record<string, { border: string; bg: string; text: string }> = {
    active: { border: 'border-[rgba(124,228,210,0.5)]', bg: 'bg-[rgba(124,228,210,0.13)]', text: 'text-white' },
    pending_payment: { border: 'border-amber-300/30', bg: 'bg-amber-300/10', text: 'text-amber-100' },
    pending_streamer_approval: { border: 'border-sky-300/30', bg: 'bg-sky-300/10', text: 'text-sky-100' },
    rejected: { border: 'border-rose-300/30', bg: 'bg-rose-300/10', text: 'text-rose-100' },
    expired: { border: 'border-white/10', bg: 'bg-white/[0.04]', text: 'text-[var(--color-copy-faint)]' },
  };

  const colors = statusColors[status] || statusColors.pending_payment;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/feed"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline"
      >
        <ArrowLeft size={16} />
        Back to feed
      </Link>

      <article className="panel rounded-2xl p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">
              Job · {item.ad.id.slice(0, 8)}…
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {item.ad.ad_type === 'banner' ? 'Media banner' : 'Token chart'}
              {item.stream ? ` → ${item.stream.display_name || STREAM_PLATFORM_NAMES[item.stream.platform]}` : ''}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--color-copy-soft)]">
              <span>{item.ad.position} · {item.ad.size} · {item.ad.duration_minutes ?? 5} min</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${colors.border} ${colors.bg} ${colors.text}`}>
            {status.replace(/_/g, ' ')}
          </span>
        </header>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Token Address</dt>
            <dd className="break-all font-mono text-sm text-[var(--color-copy)]">
              {item.ad.token_address || 'Not specified'}
            </dd>
          </div>

          {item.ad.ad_type === 'chart' && item.ad.chain && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Chain</dt>
              <dd className="font-mono text-sm text-[var(--color-copy)] capitalize">{item.ad.chain}</dd>
            </div>
          )}

          {item.ad.dex_pair_address && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">DEX Pair</dt>
              <dd className="break-all font-mono text-sm text-[var(--color-copy)]">{item.ad.dex_pair_address}</dd>
            </div>
          )}

          {item.ad.banner_url && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Banner</dt>
              <dd>
                <a
                  href={item.ad.banner_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
                >
                  View banner <ExternalLink size={14} />
                </a>
              </dd>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Duration</dt>
            <dd className="text-sm text-[var(--color-copy)]">{item.ad.duration_minutes ?? 5} minutes</dd>
          </div>

          {item.ad.starts_at && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Starts At</dt>
              <dd className="text-sm text-[var(--color-copy)]">
                {new Date(item.ad.starts_at).toLocaleString()}
              </dd>
            </div>
          )}

          {item.ad.expires_at && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Expires At</dt>
              <dd className="text-sm text-[var(--color-copy)]">
                {new Date(item.ad.expires_at).toLocaleString()}
              </dd>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)] mb-1.5">Total Paid</dt>
            <dd className="text-lg font-semibold text-[var(--color-accent)]">
              {totalPaid > 0 ? `${totalPaid} SOL` : '—'}
            </dd>
          </div>
        </dl>

        {item.stream && (
          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Stream Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">Stream ID</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--color-copy)]">{item.stream.id}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">Display Name</dt>
                <dd className="mt-1 text-sm text-[var(--color-copy)]">
                  {item.stream.display_name || STREAM_PLATFORM_NAMES[item.stream.platform]}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">Platform</dt>
                <dd className="mt-1 text-sm text-[var(--color-copy)] capitalize">{item.stream.platform}</dd>
              </div>
            </dl>
          </section>
        )}

        {item.payments.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-3">Payment History</h2>
            <ul className="grid gap-2">
              {item.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] text-[var(--color-copy-faint)]">
                      {payment.id.slice(0, 8)}…
                    </span>
                    <span className="text-sm text-[var(--color-copy)]">
                      {payment.amount} {payment.currency}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-copy-soft)]">
                      {payment.status}
                    </span>
                    {payment.tx_hash && (
                      <a
                        href={`https://solscan.io/tx/${payment.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-[var(--color-accent)] hover:underline"
                      >
                        {payment.tx_hash.slice(0, 8)}… <ExternalLink size={12} />
                      </a>
                    )}
                    {payment.verified_at && (
                      <span className="text-[10px] text-[var(--color-copy-faint)]">
                        verified {new Date(payment.verified_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-8 border-t border-white/10 pt-4 text-xs text-[var(--color-copy-faint)]">
          <p>Job ID: {item.ad.id}</p>
          <p>Created: {new Date(item.ad.created_at).toLocaleString()}</p>
          {item.ad.payment_tx_signature && (
            <p className="mt-1">
              Payment tx:{' '}
              <a
                href={`https://solscan.io/tx/${item.ad.payment_tx_signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:underline"
              >
                {item.ad.payment_tx_signature.slice(0, 16)}…
              </a>
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
