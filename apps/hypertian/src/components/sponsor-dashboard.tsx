'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { LoaderCircle, WalletCards } from 'lucide-react';
import { MetricCard } from '@/components/app-shell';
import { CopyButton } from '@/components/copy-button';
import { SyncUser } from '@/components/sync-user';
import { DEFAULT_AD_PRICE_SOL, STREAM_PLATFORM_NAMES } from '@/lib/constants';
import { isPrivyEnabled } from '@/lib/env';
import { isFreshHeartbeat } from '@/lib/platform';
import { AdRecord, StreamRecord } from '@/lib/types';

interface PendingPayment {
  ad: AdRecord;
  paymentId: string;
  amount: number;
  currency: 'SOL';
  recipientAddress: string | null;
  paymentRecipientKind?: 'streamer_direct' | 'escrow';
  paidToWallet?: string | null;
  commissionBps?: number;
  platformFeeAmount?: number;
  streamerAmount?: number;
  durationMinutes: number;
}

type SponsorDashboardContentProps = {
  authenticated: boolean;
  getAccessToken?: () => Promise<string | null>;
  initialStreams: StreamRecord[];
  initialAds: AdRecord[];
};

function readableStatus(value: string | null | undefined) {
  return (value || 'pending').replace(/_/g, ' ');
}

export function SponsorDashboard({
  streams,
  ads,
}: {
  streams: StreamRecord[];
  ads: AdRecord[];
}) {
  if (!isPrivyEnabled()) {
    return <SponsorDashboardContent authenticated={false} initialAds={ads} initialStreams={streams} />;
  }

  return <PrivySponsorDashboard initialAds={ads} initialStreams={streams} />;
}

function SponsorDashboardContent({
  authenticated,
  getAccessToken,
  initialStreams,
  initialAds,
}: SponsorDashboardContentProps) {
  const panelClassName = 'panel rounded-[32px] p-6';
  const fieldClassName = 'field';
  const [streams, setStreams] = useState(initialStreams);
  const [myAds, setMyAds] = useState(initialAds);
  const [selectedStreamId, setSelectedStreamId] = useState(initialStreams[0]?.id || '');
  const [adType, setAdType] = useState<'chart' | 'banner'>('chart');
  const [tokenAddress, setTokenAddress] = useState('');
  const [chain, setChain] = useState<'solana' | 'base' | 'ethereum' | 'bsc' | 'arbitrum' | 'polygon'>('solana');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [advertiserContact, setAdvertiserContact] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [createdPayment, setCreatedPayment] = useState<PendingPayment | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-refresh payment verification when pending
  useEffect(() => {
    if (paymentState !== 'pending' || !createdPayment) {
      return;
    }

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: createdPayment.paymentId,
            txSignature: txSignature || 'poll-only',
          }),
        });
        if (response.ok) {
          const json = (await response.json()) as { status?: string; reason?: string | null };
          if (json.status === 'active' || json.status === 'pending_streamer_approval') {
            setPaymentState('verified');
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    pollPaymentStatus();
    const interval = setInterval(pollPaymentStatus, 15_000);
    return () => clearInterval(interval);
  }, [paymentState, createdPayment, txSignature]);

  useEffect(() => {
    async function loadStreams() {
      try {
        const response = await fetch('/api/streams', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as { streams?: StreamRecord[] };
        const nextStreams = json.streams ?? [];
        setStreams(nextStreams);
        setSelectedStreamId((current) => current || nextStreams[0]?.id || '');
      } finally {
        setLoadingStreams(false);
      }
    }

    void loadStreams();
  }, []);

  const selectedStream = useMemo(
    () => streams.find((stream) => stream.id === selectedStreamId) ?? null,
    [selectedStreamId, streams],
  );

  async function submitCampaign() {
    setSubmitting(true);
    setErrorMessage(null);
    setPaymentState('idle');
    setCreatedPayment(null);

    try {
      const accessToken = await getAccessToken?.();
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: selectedStreamId,
          adType,
          tokenAddress: adType === 'chart' ? tokenAddress : null,
          chain,
          bannerUrl: adType === 'banner' ? bannerUrl : null,
          advertiserContact: advertiserContact || null,
        }),
      });

      const json = (await response.json()) as PendingPayment & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Failed to create ad checkout.');
      }

      setCreatedPayment(json);
      setPaymentState('pending');
      if (authenticated) {
        setMyAds((current) => [json.ad, ...current]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create ad checkout.');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadBanner() {
    if (!bannerFile) {
      return;
    }

    setUploadingBanner(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/filebase/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: bannerFile.name,
          contentType: bannerFile.type,
          fileSize: bannerFile.size,
        }),
      });
      const json = (await response.json()) as { uploadUrl?: string; publicUrl?: string; error?: string };
      if (!response.ok || !json.uploadUrl || !json.publicUrl) {
        throw new Error(json.error || 'Failed to prepare Filebase upload.');
      }

      const uploadResponse = await fetch(json.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': bannerFile.type,
        },
        body: bannerFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Filebase upload failed.');
      }

      setBannerUrl(json.publicUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  }

  async function verifyPayment() {
    if (!createdPayment) {
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: createdPayment.paymentId,
          txSignature,
        }),
      });
      const json = (await response.json()) as { status?: string; reason?: string | null; error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Failed to verify payment.');
      }
      if (json.status === 'active' || json.status === 'pending_streamer_approval') {
        setPaymentState('verified');
      } else {
        setErrorMessage(json.reason || 'Payment is not verified yet.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify payment.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon="stream" label="Inventory" value={String(streams.length)} hint="Available creator placements for sponsor bookings." />
        <MetricCard icon="activity" label="Ad types" value="Chart + Banner" hint="Chart ads activate after payment. Banner ads also require creator approval." />
        <MetricCard icon="wallet" label="Campaigns" value={String(myAds.length)} hint={authenticated ? 'Signed-in sponsors can track recent bookings.' : `Placements start at ${DEFAULT_AD_PRICE_SOL} SOL`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={panelClassName}>
          <div className="section-kicker">Sponsor booking</div>
          <h2 className="section-heading">Book a live placement</h2>
          <p className="section-copy">
            Choose a creator, select the format, and confirm payment. Banner media runs after creator approval.
          </p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="sponsor-stream">
              Stream
              <select disabled={loadingStreams} id="sponsor-stream" className={fieldClassName} onChange={(event) => setSelectedStreamId(event.target.value)} value={selectedStreamId}>
                {!streams.length ? <option value="">No streams available</option> : null}
                {streams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.display_name || 'Creator stream'} · {isFreshHeartbeat(stream.last_heartbeat) ? 'Live' : 'Available'}
                  </option>
                ))}
              </select>
            </label>
            {loadingStreams ? (
              <div className="soft-card flex items-center gap-3 text-sm text-[var(--color-copy-soft)]">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                Loading available placements...
              </div>
            ) : null}
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="ad-type">
              Ad type
              <select id="ad-type" className={fieldClassName} onChange={(event) => setAdType(event.target.value as typeof adType)} value={adType}>
                <option value="chart">Live token chart</option>
                <option value="banner">Approved banner</option>
              </select>
            </label>
            {adType === 'chart' ? (
              <>
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="token-address">
                  Token address
                  <input autoCapitalize="off" autoCorrect="off" id="token-address" className={fieldClassName} onChange={(event) => setTokenAddress(event.target.value)} placeholder="So11111111111111111111111111111111111111112" spellCheck={false} value={tokenAddress} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="chain">
                  Network
                  <select id="chain" className={fieldClassName} onChange={(event) => setChain(event.target.value as typeof chain)} value={chain}>
                    <option value="solana">Solana</option>
                    <option value="base">Base</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </label>
              </>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="banner-url">
                  Banner asset
                  <input autoComplete="url" id="banner-url" className={fieldClassName} inputMode="url" onChange={(event) => setBannerUrl(event.target.value)} placeholder="Banner asset link" type="url" value={bannerUrl} />
                </label>
                <div className="soft-card grid gap-3">
                  <label className="grid gap-2 text-sm font-medium text-white" htmlFor="banner-file">
                    Upload banner asset
                    <input
                      id="banner-file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      className={fieldClassName}
                      onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </label>
                  <div className="text-sm text-[var(--color-copy-soft)]">
                    Add a ready-to-review banner asset for the creator.
                  </div>
                  <button className="secondary-button" disabled={!bannerFile || uploadingBanner} onClick={uploadBanner} type="button">
                    {uploadingBanner ? 'Uploading...' : 'Upload banner'}
                  </button>
                </div>
              </div>
            )}
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="advertiser-contact">
              Campaign contact
              <input autoComplete="email" id="advertiser-contact" className={fieldClassName} onChange={(event) => setAdvertiserContact(event.target.value)} placeholder="email or @handle for campaign follow-up" value={advertiserContact} />
            </label>
            <div className="status-note">
              Chart placements activate after payment. Banner placements also need creator approval.
            </div>
            <button aria-busy={submitting} className="primary-button" disabled={!selectedStreamId || submitting || (adType === 'chart' ? !tokenAddress : !bannerUrl)} onClick={submitCampaign} type="button">
              {submitting ? 'Preparing booking...' : `Book for ${selectedStream?.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL`}
            </button>
            {errorMessage ? <div className="status-note" data-tone="danger">{errorMessage}</div> : null}
            {createdPayment ? (
              <div className="soft-card text-sm text-[var(--color-copy-soft)]">
                <div className="section-kicker text-[var(--color-accent-alt)]">Payment</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {createdPayment.amount} {createdPayment.currency}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.24em] text-[var(--color-copy-faint)]">
                  {createdPayment.paymentRecipientKind === 'escrow' ? 'Deposit wallet' : 'Creator payout wallet'}
                </div>
                <div className="mt-1 break-all font-mono text-xs text-[var(--color-accent)]">{createdPayment.recipientAddress}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {createdPayment.recipientAddress ? <CopyButton className="secondary-button" label="Copy address" value={createdPayment.recipientAddress} /> : null}
                </div>
                {createdPayment.paymentRecipientKind === 'escrow' ? (
                  <div className="mt-4 text-sm leading-6 text-[var(--color-copy-soft)]">
                    Creator payout: <span className="break-all font-mono text-[var(--color-accent)]">{createdPayment.paidToWallet}</span>
                    {createdPayment.commissionBps ? (
                      <span className="mt-1 block">
                        Pump commission {(createdPayment.commissionBps / 100).toFixed(2)}% · creator share {createdPayment.streamerAmount} SOL · platform fee {createdPayment.platformFeeAmount} SOL
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <label className="mt-4 grid gap-2 text-sm font-medium text-white" htmlFor="tx-signature">
                  Payment signature
                  <input autoCapitalize="off" autoCorrect="off" id="tx-signature" className={fieldClassName} onChange={(event) => setTxSignature(event.target.value)} placeholder="Solana signature" spellCheck={false} value={txSignature} />
                </label>
                <button className="secondary-button mt-3" disabled={!txSignature || verifying} onClick={verifyPayment} type="button">
                  {verifying ? 'Verifying...' : 'Verify payment'}
                </button>
                <div className="pill mt-3">
                  {paymentState === 'verified'
                    ? adType === 'banner'
                      ? 'Paid · Awaiting approval'
                      : 'Paid · Ready to run'
                    : 'Awaiting payment'}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={panelClassName}>
          <div className="section-kicker text-[var(--color-accent-alt)]">Creator inventory</div>
          <h2 className="section-heading">Choose an available placement</h2>
          <p className="section-copy">
            Compare platform, rate, and live availability before booking.
          </p>
          <div className="mt-4 grid gap-4">
            {streams.map((stream) => (
              <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" key={stream.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}</h3>
                    <p className="mt-1 text-sm text-[var(--color-copy-soft)]">
                      {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL · {isFreshHeartbeat(stream.last_heartbeat) ? 'Live now' : 'Available soon'}
                    </p>
                  </div>
                  <button className="secondary-button" onClick={() => setSelectedStreamId(stream.id)} type="button">
                    Select stream
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stream.profile_url ? (
                    <a className="secondary-button" href={stream.profile_url} rel="noreferrer" target="_blank">
                      View profile
                    </a>
                  ) : null}
                  {stream.stream_url ? (
                    <a className="secondary-button" href={stream.stream_url} rel="noreferrer" target="_blank">
                      Watch stream
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
            {!loadingStreams && !streams.length ? (
              <div className="soft-card">
                <div className="flex items-start gap-3">
                  <WalletCards aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--color-accent)]" />
                  <div>
                    <h3 className="text-base font-semibold text-white">No creator inventory yet</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">
                      New sponsor-ready placements will appear here as creators join.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {authenticated ? (
        <section className={panelClassName}>
          <div className="section-kicker text-[var(--color-copy)]">Recent campaigns</div>
          <h2 className="section-heading">Your sponsor activity</h2>
          <p className="section-copy">
            Review booking status and campaign details from your sponsor profile.
          </p>
          <div className="mt-4 grid gap-4">
            {myAds.map((ad) => (
              <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" key={ad.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{ad.ad_type === 'banner' ? 'Banner campaign' : 'Chart campaign'}</h3>
                    <p className="mt-1 text-sm text-[var(--color-copy-soft)]">
                      {readableStatus(ad.status)} · {ad.chain}
                    </p>
                  </div>
                  <div className="pill">{ad.id.slice(0, 8)}</div>
                </div>
                {ad.banner_url ? (
                  <a className="secondary-button mt-3" href={ad.banner_url} rel="noreferrer" target="_blank">
                    View banner
                  </a>
                ) : null}
                {ad.token_address ? <div className="mt-3 break-all font-mono text-xs text-[var(--color-accent)]">{ad.token_address}</div> : null}
              </article>
            ))}
            {!myAds.length ? <div className="status-note">No campaigns yet. Book a placement while signed in to start your history.</div> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PrivySponsorDashboard({
  initialStreams,
  initialAds,
}: {
  initialStreams: StreamRecord[];
  initialAds: AdRecord[];
}) {
  const { authenticated, getAccessToken, ready } = usePrivy();
  const [ads, setAds] = useState(initialAds);

  useEffect(() => {
    async function loadSponsorDashboard() {
      if (!ready || !authenticated) {
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/dashboard/sponsor', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        return;
      }

      const json = (await response.json()) as { ads?: AdRecord[] };
      setAds(json.ads ?? []);
    }

    void loadSponsorDashboard();
  }, [authenticated, getAccessToken, ready]);

  return (
    <>
      {authenticated ? <SyncUser role="sponsor" /> : null}
      <SponsorDashboardContent authenticated={authenticated} getAccessToken={getAccessToken} initialAds={ads} initialStreams={initialStreams} />
    </>
  );
}
