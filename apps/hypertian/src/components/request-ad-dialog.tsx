'use client';

import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { DirectoryStream } from '@/lib/supabase/anon-queries';
import { STREAM_PLATFORM_NAMES } from '@/lib/constants';

type Props = {
  stream: DirectoryStream;
  kind: 'chart' | 'banner';
  onClose: () => void;
};

type CreateResponse = {
  ad?: { id: string; status: string | null };
  paymentId?: string;
  amount?: number;
  currency?: string;
  durationMinutes?: number;
  recipientAddress?: string;
  depositAddress?: string;
  paidToWallet?: string;
  error?: string;
};

export function RequestAdDialog({ stream, kind, onClose }: Props) {
  const [tokenAddress, setTokenAddress] = useState(stream.default_chart_token_address || stream.pump_mint || '');
  const [bannerUrl, setBannerUrl] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: stream.id,
          adType: kind,
          tokenAddress: kind === 'chart' ? tokenAddress : null,
          chain: 'solana',
          bannerUrl: kind === 'banner' ? bannerUrl : null,
          advertiserContact: contact || null,
          advertiserNote: note || null,
        }),
      });
      const data = (await res.json()) as CreateResponse;
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create ad request.');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ad request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} type="button" />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[rgba(7,14,17,0.96)] shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-accent)]">{kind === 'chart' ? 'Chart request' : 'Media request'}</div>
            <div className="mt-1 text-sm font-medium text-white">{stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}</div>
          </div>
          <button aria-label="Close dialog" className="text-sm text-[var(--color-copy-soft)] hover:text-white" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="grid gap-3 px-5 py-4">
          {!result ? (
            <>
              {kind === 'chart' ? (
                <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
                  Token address (Solana)
                  <input className="field" onChange={(e) => setTokenAddress(e.target.value)} placeholder="So11..." spellCheck={false} value={tokenAddress} />
                </label>
              ) : (
                <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
                  Banner URL (https, image/gif/mp4)
                  <input className="field" onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." value={bannerUrl} />
                </label>
              )}
              <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
                Contact (optional)
                <input className="field" onChange={(e) => setContact(e.target.value)} placeholder="@handle, email, or telegram" value={contact} />
              </label>
              <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]">
                Note (optional)
                <textarea className="field min-h-[64px]" onChange={(e) => setNote(e.target.value)} placeholder="Anything the streamer should know" value={note} />
              </label>
              {error ? <div className="status-note" data-tone="danger">{error}</div> : null}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button className="secondary-button" onClick={onClose} type="button">Cancel</button>
                <button
                  className="primary-button"
                  disabled={submitting || (kind === 'chart' ? !tokenAddress : !bannerUrl)}
                  onClick={() => void submit()}
                  type="button"
                >
                  {submitting ? 'Creating…' : 'Create job card'}
                </button>
              </div>
            </>
          ) : (
            <div className="grid gap-3">
              <div className="status-note" data-tone="success">Job card created.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-[var(--color-copy)]">
                <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Pay {result.amount} {result.currency} to</div>
                <div className="mt-1 break-all font-mono text-xs">{result.depositAddress}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.depositAddress ? <CopyButton className="secondary-button" label="Copy address" value={result.depositAddress} /> : null}
                </div>
              </div>
              <p className="text-xs text-[var(--color-copy-soft)]">
                Once payment is verified, {kind === 'chart' ? 'the chart goes live automatically' : 'the streamer reviews the banner'}. Track it in the Feed.
              </p>
              <div className="flex justify-end">
                <button className="primary-button" onClick={onClose} type="button">Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
