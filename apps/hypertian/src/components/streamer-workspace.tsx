'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LoaderCircle, RadioTower } from 'lucide-react';
import { CopyButton } from '@/components/copy-button';
import { DEFAULT_AD_PRICE_SOL, DEFAULT_CHART_TOKEN_ADDRESS, DEFAULT_STREAM_BANNER_URL, STREAM_PLATFORM_NAMES } from '@/lib/constants';
import { AdRecord, StreamPlatform, StreamRecord } from '@/lib/types';

type StreamerStream = StreamRecord & { overlayUrl?: string };

type Props = {
  initialStreams: StreamerStream[];
  initialPendingAds: AdRecord[];
};

type HeartbeatState = {
  isLive: boolean;
  lastHeartbeat: string | null;
  everReceived: boolean;
};

const HEARTBEAT_POLL_MS = 60_000;
const MAX_BANNER_BYTES = 1024 * 1024;

function resolveIdentity(input: string, platform: StreamPlatform, streamUrl: string) {
  const value = input.trim();
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new URL(value);
    const handle = url.pathname.split('/').filter(Boolean)[0] || url.hostname;
    return {
      displayName: handle.replace(/^@/, '') || STREAM_PLATFORM_NAMES[platform],
      profileUrl: value,
    };
  }

  const handle = value.replace(/^@/, '');
  return {
    displayName: handle || STREAM_PLATFORM_NAMES[platform],
    profileUrl: platform === 'x' && handle ? `https://x.com/${handle}` : streamUrl,
  };
}

export function StreamerWorkspace({ initialStreams, initialPendingAds }: Props) {
  const [streams, setStreams] = useState<StreamerStream[]>(initialStreams);
  const [pendingAds, setPendingAds] = useState<AdRecord[]>(initialPendingAds);
  const [heartbeatStates, setHeartbeatStates] = useState<Record<string, HeartbeatState>>({});

  const [platform, setPlatform] = useState<StreamPlatform>('x');
  const [identity, setIdentity] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [payoutWallet, setPayoutWallet] = useState('');
  const [pumpMint, setPumpMint] = useState('');
  const [pumpDeployerWallet, setPumpDeployerWallet] = useState('');
  const [priceSol, setPriceSol] = useState(String(DEFAULT_AD_PRICE_SOL));
  const [defaultBannerUrl, setDefaultBannerUrl] = useState('');
  const [defaultChartTokenAddress, setDefaultChartTokenAddress] = useState('');
  const [defaultBannerFile, setDefaultBannerFile] = useState<File | null>(null);

  const [bannerEdits, setBannerEdits] = useState<Record<string, string>>({});
  const [bannerSavingId, setBannerSavingId] = useState<string | null>(null);
  const [reviewingAdId, setReviewingAdId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamIds = useMemo(() => streams.map((stream) => stream.id), [streams]);

  useEffect(() => {
    if (!streamIds.length) {
      return;
    }

    let cancelled = false;

    async function poll() {
      const next: Record<string, HeartbeatState> = {};
      await Promise.all(
        streamIds.map(async (id) => {
          try {
            const res = await fetch(`/api/public/streams/heartbeat-status?streamId=${id}`, { cache: 'no-store' });
            if (!res.ok) {
              return;
            }
            const data = (await res.json()) as HeartbeatState;
            next[id] = data;
          } catch {
            // ignore transient failures
          }
        }),
      );
      if (!cancelled) {
        setHeartbeatStates((prev) => ({ ...prev, ...next }));
      }
    }

    void poll();
    const handle = window.setInterval(poll, HEARTBEAT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [streamIds]);

  async function refreshPendingAds() {
    try {
      const res = await fetch('/api/public/streams', { cache: 'no-store' });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { streams?: StreamerStream[]; pendingAds?: AdRecord[] };
      if (data.streams) {
        setStreams(data.streams);
      }
      if (data.pendingAds) {
        setPendingAds(data.pendingAds);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const handle = window.setInterval(() => {
      void refreshPendingAds();
    }, 15_000);
    return () => window.clearInterval(handle);
  }, []);

  async function createProfile() {
    setCreating(true);
    setErrorMessage(null);
    try {
      const identityValues = resolveIdentity(identity, platform, streamUrl);
      const uploadedBannerUrl = defaultBannerFile ? await uploadBannerAsset(defaultBannerFile) : null;
      const res = await fetch('/api/public/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          displayName: identityValues.displayName,
          profileUrl: identityValues.profileUrl,
          streamUrl,
          payoutWallet: platform === 'x' ? payoutWallet : null,
          priceSol: Number(priceSol || DEFAULT_AD_PRICE_SOL),
          defaultBannerUrl: uploadedBannerUrl || defaultBannerUrl || null,
          defaultChartTokenAddress: platform === 'pump' ? pumpMint || null : defaultChartTokenAddress || null,
          pumpMint: platform === 'pump' ? pumpMint || null : null,
          pumpDeployerWallet: platform === 'pump' ? pumpDeployerWallet : null,
        }),
      });
      const data = (await res.json()) as { stream?: StreamerStream; overlayUrl?: string; error?: string };
      if (!res.ok || !data.stream) {
        throw new Error(data.error || 'Failed to create profile.');
      }
      const next: StreamerStream = { ...data.stream, overlayUrl: data.overlayUrl };
      setStreams((current) => [next, ...current]);
      setIdentity('');
      setStreamUrl('');
      setPayoutWallet('');
      setPumpMint('');
      setPumpDeployerWallet('');
      setDefaultBannerUrl('');
      setDefaultChartTokenAddress('');
      setDefaultBannerFile(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create profile.');
    } finally {
      setCreating(false);
    }
  }

  async function uploadBannerAsset(file: File) {
    if (file.size > MAX_BANNER_BYTES) {
      throw new Error('Banner upload must be 1MB or smaller.');
    }

    const presign = await fetch('/api/filebase/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });
    const upload = (await presign.json()) as { uploadUrl?: string; publicUrl?: string; error?: string };
    if (!presign.ok || !upload.uploadUrl || !upload.publicUrl) {
      throw new Error(upload.error || 'Failed to prepare upload.');
    }

    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!put.ok) {
      throw new Error('Upload failed.');
    }

    return upload.publicUrl;
  }

  async function saveBanner(streamId: string) {
    const url = bannerEdits[streamId] ?? '';
    setBannerSavingId(streamId);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/public/streams/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, bannerUrl: url || null }),
      });
      const data = (await res.json()) as { stream?: StreamRecord; error?: string };
      if (!res.ok || !data.stream) {
        throw new Error(data.error || 'Failed to update banner.');
      }
      setStreams((current) => current.map((s) => (s.id === streamId ? { ...s, default_banner_url: data.stream!.default_banner_url } : s)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update banner.');
    } finally {
      setBannerSavingId(null);
    }
  }

  async function uploadBanner(streamId: string, file: File | null) {
    if (!file) return;
    setBannerSavingId(streamId);
    setErrorMessage(null);
    try {
      const publicUrl = await uploadBannerAsset(file);

      const res = await fetch('/api/public/streams/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, bannerUrl: publicUrl }),
      });
      const data = (await res.json()) as { stream?: StreamRecord; error?: string };
      if (!res.ok || !data.stream) {
        throw new Error(data.error || 'Failed to save uploaded banner.');
      }
      setBannerEdits((prev) => ({ ...prev, [streamId]: publicUrl }));
      setStreams((current) => current.map((s) => (s.id === streamId ? { ...s, default_banner_url: data.stream!.default_banner_url } : s)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload banner.');
    } finally {
      setBannerSavingId(null);
    }
  }

  async function reviewAd(adId: string, decision: 'approved' | 'rejected') {
    setReviewingAdId(adId);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/public/ads/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, decision }),
      });
      const data = (await res.json()) as { ad?: AdRecord; error?: string };
      if (!res.ok || !data.ad) {
        throw new Error(data.error || 'Failed to review ad.');
      }
      setPendingAds((current) => current.filter((ad) => ad.id !== adId));
      void refreshPendingAds();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to review ad.');
    } finally {
      setReviewingAdId(null);
    }
  }

  const liveCount = Object.values(heartbeatStates).filter((s) => s.isLive).length;
  const walletReady = platform === 'pump' ? pumpDeployerWallet : payoutWallet;
  const chartReady = platform === 'pump' ? pumpMint : true;
  const canCreate = identity && streamUrl && walletReady && chartReady && !creating;

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Streamer</div>
        <h1 className="text-3xl font-semibold text-white">Create profile, verify overlay, approve banners.</h1>
        <p className="max-w-2xl text-sm text-[var(--color-copy-soft)]">
          X Broadcasts and Pump streams only. No login required — your profile is bound to this browser.
          Add the overlay link to OBS as a Browser Source to go live.
        </p>
      </header>

      <section className="panel rounded-3xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">New stream profile</h2>
          <span className="pill">{streams.length ? `${streams.length} profile${streams.length === 1 ? '' : 's'}` : 'No profiles yet'}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            Platform
            <select className="field" onChange={(e) => setPlatform(e.target.value as StreamPlatform)} value={platform}>
              <option value="x">X Broadcast</option>
              <option value="pump">Pump Stream</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            X username or profile link
            <input
              autoComplete="off"
              className="field"
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="@HyperMythX or https://x.com/HyperMythX"
              spellCheck={false}
              value={identity}
            />
          </label>
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            Stream URL (https)
            <input className="field" inputMode="url" onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://x.com/handle/status/..." type="url" value={streamUrl} />
          </label>
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            {platform === 'pump' ? 'X payout wallet (unused for Pump)' : 'Payout wallet (Solana)'}
            <input
              className="field"
              disabled={platform === 'pump'}
              onChange={(e) => setPayoutWallet(e.target.value)}
              placeholder={platform === 'pump' ? 'Pump ads pay the deployer wallet below' : 'So11...'}
              spellCheck={false}
              value={platform === 'pump' ? '' : payoutWallet}
            />
          </label>
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            Base price (SOL)
            <input className="field" inputMode="decimal" min="0" onChange={(e) => setPriceSol(e.target.value)} step="0.001" type="text" value={priceSol} />
          </label>
          <label className="md:col-span-2 grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            Default banner URL (optional, https)
            <input className="field" inputMode="url" onChange={(e) => setDefaultBannerUrl(e.target.value)} placeholder="https://..." type="url" value={defaultBannerUrl} />
          </label>
          {platform === 'x' ? (
            <label className="md:col-span-2 grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
              Default chart CA
              <input
                autoCapitalize="off"
                autoCorrect="off"
                className="field"
                onChange={(e) => setDefaultChartTokenAddress(e.target.value)}
                placeholder={DEFAULT_CHART_TOKEN_ADDRESS}
                spellCheck={false}
                value={defaultChartTokenAddress}
              />
            </label>
          ) : null}
          <label className="md:col-span-2 grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
            Upload default banner (optional, max 1 MB)
            <input
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="field"
              onChange={(event) => setDefaultBannerFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          {platform === 'pump' ? (
            <>
              <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
                Pump token mint / default chart CA
                <input className="field" onChange={(e) => setPumpMint(e.target.value)} placeholder="Mint address" spellCheck={false} value={pumpMint} />
              </label>
              <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-copy-faint)]">
                Pump deployer wallet
                <input
                  className="field"
                  onChange={(e) => setPumpDeployerWallet(e.target.value)}
                  placeholder="Deployer wallet receives Pump ad payments"
                  spellCheck={false}
                  value={pumpDeployerWallet}
                />
              </label>
            </>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="primary-button" disabled={!canCreate} onClick={() => void createProfile()} type="button">
            {creating ? 'Creating…' : 'Create profile'}
          </button>
          <span className="text-xs text-[var(--color-copy-faint)]">
            {defaultBannerFile ? `${defaultBannerFile.name} selected · ` : ''}Default GIF: {DEFAULT_STREAM_BANNER_URL} · 0% commission.
          </span>
        </div>
        {errorMessage ? <div className="status-note mt-3" data-tone="danger">{errorMessage}</div> : null}
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your streams</h2>
          <span className="text-xs text-[var(--color-copy-soft)]">{liveCount} live · heartbeat checked every minute</span>
        </div>
        {!streams.length ? (
          <div className="soft-card flex items-start gap-3">
            <RadioTower aria-hidden className="mt-1 h-5 w-5 text-[var(--color-accent)]" />
            <div>
              <div className="font-medium text-white">No profile yet</div>
              <p className="mt-1 text-sm text-[var(--color-copy-soft)]">Create one above. Streams stay tied to this browser.</p>
            </div>
          </div>
        ) : null}
        {streams.map((stream) => {
          const hb = heartbeatStates[stream.id];
          const overlayUrl = stream.overlayUrl || '';
          const live = hb?.isLive ?? false;
          const everReceived = hb?.everReceived ?? false;
          const bannerValue = bannerEdits[stream.id] ?? stream.default_banner_url ?? '';
          const chartValue = stream.platform === 'pump' ? stream.pump_mint : stream.default_chart_token_address || DEFAULT_CHART_TOKEN_ADDRESS;

          return (
            <article className="panel rounded-3xl p-5" key={stream.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">{stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}</div>
                  <div className="text-xs text-[var(--color-copy-soft)]">
                    {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL · chart {chartValue ? `${chartValue.slice(0, 6)}...${chartValue.slice(-4)}` : 'unset'}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                  live
                    ? 'border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] text-white'
                    : everReceived
                      ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.04] text-[var(--color-copy-soft)]'
                }`}>
                  {live ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {live ? 'Heartbeat fresh' : everReceived ? 'Heartbeat stale' : 'Waiting for first heartbeat'}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">OBS browser source</div>
                  <div className="mt-1 break-all font-mono text-xs text-[var(--color-copy)]">{overlayUrl}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {overlayUrl ? <CopyButton className="secondary-button" label="Copy overlay URL" value={overlayUrl} /> : null}
                    {overlayUrl ? <a className="secondary-button" href={overlayUrl} rel="noreferrer" target="_blank">Open preview</a> : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-copy-soft)]">
                    Add as Browser Source in OBS (1920×1080, transparent). Heartbeat fires every minute once it loads.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Default media banner</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      aria-label="Default banner URL"
                      className="field"
                      onChange={(e) => setBannerEdits((prev) => ({ ...prev, [stream.id]: e.target.value }))}
                      placeholder="https://…"
                      value={bannerValue}
                    />
                    <button
                      className="primary-button"
                      disabled={bannerSavingId === stream.id}
                      onClick={() => void saveBanner(stream.id)}
                      type="button"
                    >
                      {bannerSavingId === stream.id ? 'Saving…' : 'Save banner'}
                    </button>
                  </div>
                  <label className="secondary-button mt-2 w-full cursor-pointer justify-center sm:w-auto">
                    Upload banner · 1 MB max
                    <input
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void uploadBanner(stream.id, file);
                        event.currentTarget.value = '';
                      }}
                      type="file"
                    />
                  </label>
                  {stream.default_banner_url ? (
                    <p className="mt-2 text-xs text-[var(--color-copy-soft)]">Currently shown when no paid ad is active.</p>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--color-copy-faint)]">Not set — overlay uses the default GIF between paid ads.</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel rounded-3xl p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Banner approval requests</h2>
        <p className="mt-1 text-sm text-[var(--color-copy-soft)]">
          Paid banner campaigns wait here for your call. Chart placements go live automatically after payment.
        </p>
        <div className="mt-4 grid gap-3">
          {pendingAds.length === 0 ? (
            <div className="status-note">No banner requests waiting.</div>
          ) : null}
          {pendingAds.map((ad) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={ad.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">Pending banner</div>
                  <div className="mt-0.5 text-xs text-[var(--color-copy-soft)]">
                    {ad.duration_minutes ?? 5} min · {ad.size}
                  </div>
                  {ad.banner_url ? (
                    <a className="mt-2 inline-block text-xs text-[var(--color-accent)] underline" href={ad.banner_url} rel="noreferrer" target="_blank">
                      Preview asset
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button className="secondary-button" disabled={reviewingAdId === ad.id} onClick={() => void reviewAd(ad.id, 'rejected')} type="button">
                    Reject
                  </button>
                  <button className="primary-button" disabled={reviewingAdId === ad.id} onClick={() => void reviewAd(ad.id, 'approved')} type="button">
                    Approve
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
