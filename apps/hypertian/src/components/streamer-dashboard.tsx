'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { LoaderCircle, RadioTower } from 'lucide-react';
import { AuthGate } from '@/components/auth-gate';
import { MetricCard } from '@/components/app-shell';
import { CopyButton } from '@/components/copy-button';
import { DEFAULT_AD_PRICE_SOL, STREAM_PLATFORM_NAMES } from '@/lib/constants';
import { isPrivyEnabled } from '@/lib/env';
import { isFreshHeartbeat } from '@/lib/platform';
import { AdRecord, StreamPlatform, StreamRecord } from '@/lib/types';

type StreamerStream = StreamRecord & { overlayUrl?: string };

type StreamerDashboardProps = {
  initialStreams: StreamerStream[];
  initialAds: AdRecord[];
};

function readableStatus(value: string | null | undefined) {
  return (value || 'review needed').replace(/_/g, ' ');
}

function StreamerDashboardContent({
  initialStreams,
  initialAds,
  canCreate,
  wallet,
  getAccessToken,
}: StreamerDashboardProps & {
  canCreate: boolean;
  wallet: string | null;
  getAccessToken?: () => Promise<string | null>;
}) {
  const panelClassName = 'panel rounded-[32px] p-6';
  const fieldClassName = 'field';
  const [streams, setStreams] = useState(initialStreams);
  const [ads, setAds] = useState(initialAds);
  const [platform, setPlatform] = useState<StreamPlatform>('x');
  const [displayName, setDisplayName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [payoutWallet, setPayoutWallet] = useState(wallet || '');
  const [priceSol, setPriceSol] = useState(String(DEFAULT_AD_PRICE_SOL));
  const [defaultBannerUrl, setDefaultBannerUrl] = useState('');
  const [pumpMint, setPumpMint] = useState('');
  const [pumpDeployerWallet, setPumpDeployerWallet] = useState('');
  const [creating, setCreating] = useState(false);
  const [reviewingAdId, setReviewingAdId] = useState<string | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(Boolean(getAccessToken));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPayoutWallet((current) => current || wallet || '');
  }, [wallet]);

  useEffect(() => {
    async function loadDashboard() {
      const accessToken = await getAccessToken?.();
      if (!accessToken) {
        setLoadingDashboard(false);
        return;
      }

      try {
        const response = await fetch('/api/dashboard/streamer', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as { streams?: StreamerStream[]; ads?: AdRecord[] };
        setStreams(json.streams ?? []);
        setAds(json.ads ?? []);
      } finally {
        setLoadingDashboard(false);
      }
    }

    void loadDashboard();
  }, [getAccessToken]);

  const activeAds = useMemo(
    () => ads.filter((ad) => ad.status === 'active' && ad.is_active && new Date(ad.expires_at).getTime() > Date.now()),
    [ads],
  );
  const pendingBannerAds = useMemo(
    () => ads.filter((ad) => ad.ad_type === 'banner' && ad.status === 'pending_streamer_approval'),
    [ads],
  );

  async function createStream() {
    setCreating(true);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken?.();
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          displayName,
          profileUrl,
          streamUrl,
          payoutWallet,
          priceSol: Number(priceSol || DEFAULT_AD_PRICE_SOL),
          defaultBannerUrl: defaultBannerUrl || null,
          pumpMint: platform === 'pump' ? pumpMint || null : null,
          pumpDeployerWallet: platform === 'pump' ? pumpDeployerWallet || payoutWallet : null,
        }),
      });
      const json = (await response.json()) as { stream?: StreamRecord; overlayUrl?: string; error?: string };
      if (!response.ok || !json.stream) {
        throw new Error(json.error || 'Failed to create stream.');
      }
      setStreams((current) => [{ ...json.stream!, overlayUrl: json.overlayUrl ?? undefined }, ...current]);
      setDisplayName('');
      setProfileUrl('');
      setStreamUrl('');
      setDefaultBannerUrl('');
      setPumpMint('');
      setPumpDeployerWallet('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create stream.');
    } finally {
      setCreating(false);
    }
  }

  async function reviewAd(adId: string, decision: 'approved' | 'rejected') {
    setReviewingAdId(adId);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken?.();
      const response = await fetch('/api/ads/review', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adId, decision }),
      });
      const json = (await response.json()) as { ad?: AdRecord; error?: string };
      if (!response.ok || !json.ad) {
        throw new Error(json.error || 'Failed to review ad.');
      }
      setAds((current) => current.map((ad) => (ad.id === json.ad!.id ? json.ad! : ad)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to review ad.');
    } finally {
      setReviewingAdId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon="stream" label="Inventory" value={String(streams.length)} hint="Sponsor-ready livestream placements." />
        <MetricCard icon="activity" label="Live ads" value={String(activeAds.length)} hint="Campaigns eligible to run now." />
        <MetricCard icon="wallet" label="Approvals" value={String(pendingBannerAds.length)} hint={wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'Connect your creator wallet for payouts.'} />
      </section>

       <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={panelClassName}>
          <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Creator setup</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Add a sponsor-ready stream</h2>
          <p className="mt-2 text-sm text-[var(--color-copy-soft)]">
            Add your profile, payout wallet, and base price once. Hypertian turns it into bookable inventory.
          </p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="stream-platform">
              Platform
              <select id="stream-platform" className={fieldClassName} onChange={(event) => setPlatform(event.target.value as StreamPlatform)} value={platform}>
                <option value="x">X</option>
                <option value="pump">PumpAds</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="display-name">
              Display name
              <input autoComplete="organization" id="display-name" className={fieldClassName} onChange={(event) => setDisplayName(event.target.value)} placeholder="HyperMythX" value={displayName} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="profile-url">
              Creator profile
              <input autoComplete="url" id="profile-url" className={fieldClassName} inputMode="url" onChange={(event) => setProfileUrl(event.target.value)} placeholder="Profile link" type="url" value={profileUrl} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="stream-url">
              Live stream link
              <input autoComplete="url" id="stream-url" className={fieldClassName} inputMode="url" onChange={(event) => setStreamUrl(event.target.value)} placeholder="Stream link" type="url" value={streamUrl} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="payout-wallet">
                Payout wallet
                <input autoCapitalize="off" autoCorrect="off" id="payout-wallet" className={fieldClassName} onChange={(event) => setPayoutWallet(event.target.value)} placeholder="Solana wallet address" spellCheck={false} value={payoutWallet} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="price-sol">
                Base price in SOL
                <input id="price-sol" className={fieldClassName} inputMode="decimal" min="0" onChange={(event) => setPriceSol(event.target.value)} step="0.001" type="number" value={priceSol} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="default-banner">
              Fallback banner asset
              <input autoComplete="url" id="default-banner" className={fieldClassName} inputMode="url" onChange={(event) => setDefaultBannerUrl(event.target.value)} placeholder="Fallback banner link" type="url" value={defaultBannerUrl} />
            </label>
            {platform === 'pump' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="pump-mint">
                  Pump mint
                  <input autoCapitalize="off" autoCorrect="off" id="pump-mint" className={fieldClassName} onChange={(event) => setPumpMint(event.target.value)} placeholder="Pump token mint" spellCheck={false} value={pumpMint} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="pump-deployer">
                  Pump deployer wallet
                  <input autoCapitalize="off" autoCorrect="off" id="pump-deployer" className={fieldClassName} onChange={(event) => setPumpDeployerWallet(event.target.value)} placeholder="Creator wallet" spellCheck={false} value={pumpDeployerWallet} />
                </label>
              </div>
            ) : null}
            <div className="status-note">
              Pump streams can include a mint and creator wallet for extra verification.
            </div>
            <button aria-busy={creating} className="primary-button" disabled={!canCreate || creating || !displayName || !profileUrl || !streamUrl || !payoutWallet} onClick={createStream} type="button">
              {creating ? 'Creating...' : canCreate ? 'Add stream' : 'Creator login required'}
            </button>
            {errorMessage ? <div className="status-note" data-tone="danger">{errorMessage}</div> : null}
          </div>
        </div>

        <div className={panelClassName}>
          <div className="section-kicker text-[var(--color-accent-alt)]">Live setup</div>
          <h2 className="section-heading">Overlay status</h2>
          <p className="section-copy">
            Keep your placement surface ready and confirm each stream is available for sponsor bookings.
          </p>
          <div className="mt-4 grid gap-4">
            {loadingDashboard ? (
              <div className="soft-card flex items-center gap-3 text-sm text-[var(--color-copy-soft)]">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                Loading your inventory...
              </div>
            ) : null}
             {streams.map((stream) => {
              const overlayUrl = stream.overlayUrl || '';
              return (
                <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={stream.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">{stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}</h3>
                      <p className="mt-0.5 text-[11px] text-[var(--color-copy-soft)]">
                        {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL · {isFreshHeartbeat(stream.last_heartbeat) ? 'Live' : 'Needs check-in'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em]">{readableStatus(stream.verification_status)}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-[11px] text-[var(--color-copy-soft)]">
                    <div>
                      <dt className="uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Placement surface</dt>
                      <dd className="text-[var(--color-copy-soft)]">{overlayUrl ? 'Ready to copy' : 'Created after stream registration'}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {overlayUrl ? <CopyButton className="secondary-button h-7 px-2.5 text-[10px]" label="Copy placement link" value={overlayUrl} /> : null}
                    {stream.stream_url ? (
                      <a className="secondary-button h-7 px-2.5 text-[10px]" href={stream.stream_url} rel="noreferrer" target="_blank">
                        Open stream
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
             {!loadingDashboard && !streams.length ? (
              <div className="soft-card">
                <div>
                  <h3 className="text-base font-semibold text-white">No streams yet</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">
                    Add your first stream to unlock sponsor bookings.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={panelClassName}>
        <div className="section-kicker text-[var(--color-copy)]">Creative review</div>
        <h2 className="section-heading">Approve banner campaigns</h2>
        <p className="section-copy">
          Paid banner campaigns wait for your approval before they run. Chart campaigns go live after payment.
        </p>
        <div className="mt-4 grid gap-4">
           {pendingBannerAds.map((ad) => (
             <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={ad.id}>
               <div className="flex flex-wrap items-center justify-between gap-2">
                 <div className="min-w-0">
                   <h3 className="text-sm font-semibold text-white">Submitted banner</h3>
                   <a className="secondary-button mt-2 h-7 px-2.5 text-[10px]" href={ad.banner_url || '#'} rel="noreferrer" target="_blank">
                     Review creative
                   </a>
                 </div>
                 <div className="flex gap-1.5">
                   <button className="secondary-button h-7 px-2.5 text-[10px]" disabled={reviewingAdId === ad.id} onClick={() => void reviewAd(ad.id, 'rejected')} type="button">
                     Reject
                   </button>
                   <button className="primary-button h-7 px-2.5 text-[10px]" disabled={reviewingAdId === ad.id} onClick={() => void reviewAd(ad.id, 'approved')} type="button">
                     Approve
                   </button>
                 </div>
               </div>
             </article>
           ))}
          {!pendingBannerAds.length ? <div className="status-note">No banner campaigns need approval right now.</div> : null}
        </div>
      </section>
    </div>
  );
}

function PrivyStreamerDashboard(props: StreamerDashboardProps) {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets.find((item) => item.address)?.address || null;

  return (
    <AuthGate role="streamer">
      <StreamerDashboardContent
        {...props}
        canCreate
        getAccessToken={getAccessToken}
        wallet={wallet}
      />
    </AuthGate>
  );
}

export function StreamerDashboard(props: StreamerDashboardProps) {
  if (!isPrivyEnabled()) {
    return <StreamerDashboardContent {...props} canCreate={false} wallet={null} />;
  }

  return <PrivyStreamerDashboard {...props} />;
}
