'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import DexChart from '@/components/DexChart';
import MediaBanner from '@/components/MediaBanner';
import OverlayDisclosure from '@/components/OverlayDisclosure';
import { useDexScreener } from '@/hooks/useDexScreener';
import { DEFAULT_CHART_TOKEN_ADDRESS, DEFAULT_STREAM_BANNER_URL, STREAM_HEARTBEAT_INTERVAL_MS } from '@/lib/constants';
import { OverlayActiveAd, StreamRecord } from '@/lib/types';

type Platform = 'x' | 'pump';

interface OverlaySurfaceProps {
  platform: Platform;
  searchParams: URLSearchParams;
}

function getPositionClass(position: string) {
  return 'bottom-10 right-6';
}

function inferMediaType(src: string | null): OverlayActiveAd['media_type'] {
  if (!src) {
    return null;
  }
  const clean = src.split('?')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.gif')) {
    return 'gif';
  }
  if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov')) {
    return 'video';
  }
  return 'image';
}

export default function OverlaySurface({ platform, searchParams }: OverlaySurfaceProps) {
  // OBS Overlay Window Size Recommendation:
  // For best results, set your browser source to 1920x1080 (or your stream resolution)
  // and use "Scale to inner size" with "Constrain proportions" unchecked.
  // Position the overlay in OBS to match your stream layout.
  const streamId = searchParams.get('stream');
  const heartbeatKey = searchParams.get('key');
  const [activeAds, setActiveAds] = useState<OverlayActiveAd[]>([]);
  const [stream, setStream] = useState<StreamRecord | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const minFetchIntervalMs = 10_000; // Rate limit token calls to once per 10 minutes
  const lastTokenCallRef = useRef<Record<string, number>>({});
  const tokenCallCooldownMs = 10 * 60 * 1000; // 10 minutes in ms

  const activeAd = activeAds[0] ?? null;
  const isBannerAd = activeAd?.ad_type === 'banner';

  // Use streamer's default chart token and banner when no ad is active
  const streamDefaultToken = stream?.platform === 'pump'
    ? stream.pump_mint || stream.default_chart_token_address
    : stream?.default_chart_token_address;
  const streamBannerUrl = stream?.default_banner_url || DEFAULT_STREAM_BANNER_URL;

  // Priority: 1) Active ad, 2) URL params, 3) Streamer defaults, 4) Global defaults
  const token = !isBannerAd
    ? activeAd?.token_address || searchParams.get('token') || streamDefaultToken || DEFAULT_CHART_TOKEN_ADDRESS
    : '';
  const chain = activeAd?.chain || searchParams.get('chain') || 'solana';
  const position = activeAd?.position || 'bottom-right';
  const size = activeAd?.size || searchParams.get('size') || 'medium';
  const theme = searchParams.get('theme') || 'dark';
  const showChart = searchParams.get('showChart') !== 'false' && !isBannerAd;

  // Show media if: there's an active banner ad OR no ad exists but we should show default media
  const shouldShowDefaultMedia = !isBannerAd && !activeAd && searchParams.get('showMedia') !== 'false';
  const showMedia = (searchParams.get('showMedia') !== 'false' && isBannerAd) || shouldShowDefaultMedia;

  // Media source: 1) Active banner ad, 2) Streamer default banner, 3) Fallback
  const mediaSrc = activeAd?.media_src || (shouldShowDefaultMedia ? streamBannerUrl : searchParams.get('mediaSrc') || null);
  const mediaType = activeAd?.media_type || inferMediaType(mediaSrc);

  // Rate-limited token key to prevent exceeding API quotas
  const rateLimitedTokenKey = useMemo(() => {
    const now = Date.now();
    const key = `${token}-${chain}`;
    const lastCall = lastTokenCallRef.current[key] || 0;
    // Only allow new calls after cooldown period for the same token
    if (now - lastCall < tokenCallCooldownMs) {
      // Return the previous key to retry with cached data
      return key;
    }
    lastTokenCallRef.current[key] = now;
    return key;
  }, [token, chain]);

  const { data, loading } = useDexScreener(rateLimitedTokenKey, chain);
  const chartSize = useMemo(
    () => (size === 'large' ? { width: 480, height: 260 } : { width: 380, height: 210 }),
    [size],
  );

  // Use callback to prevent unnecessary re-renders
  const loadActiveAds = useCallback(async () => {
    if (!streamId) {
      setActiveAds([]);
      return;
    }

    const now = Date.now();
    if (now - lastFetchTimeRef.current < minFetchIntervalMs) {
      return; // Rate limit API calls
    }
    lastFetchTimeRef.current = now;

    try {
      const response = await fetch(`/api/ads?stream=${encodeURIComponent(streamId)}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        return;
      }
      const json = (await response.json()) as { ads?: OverlayActiveAd[]; stream?: StreamRecord | null };
      setStream(json.stream ?? null);
      setActiveAds(json.ads ?? []);
    } catch {
      // Query-param previews should keep working even when the ad feed is unreachable.
    }
  }, [streamId]);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';

    const sendHeartbeat = () => {
      if (!streamId || !heartbeatKey) {
        return;
      }

      void fetch('/api/streams/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, key: heartbeatKey }),
      });
    };

    sendHeartbeat();
    const heartbeat = streamId
      ? setInterval(() => {
          sendHeartbeat();
        }, STREAM_HEARTBEAT_INTERVAL_MS)
      : null;

    void loadActiveAds();
    const adRefresh = streamId
      ? setInterval(() => {
          void loadActiveAds();
        }, 20_000)
      : null;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.dispatchEvent(new Event('resize'));
        void loadActiveAds();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (adRefresh) {
        clearInterval(adRefresh);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [heartbeatKey, streamId, loadActiveAds]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent select-none">
      <div className={`absolute ${getPositionClass(position)} flex max-w-[calc(100vw-3rem)] flex-wrap gap-4`}>
        {showChart && token ? (
          <div className="rounded-[24px] border border-white/10 bg-zinc-950/90 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-mono text-cyan-400">{token.slice(0, 8)}...</span>
              <span className="text-emerald-400">
                {loading ? 'Loading…' : `$${Number(data?.priceUsd || 0).toFixed(6)}`}
              </span>
            </div>
            <DexChart chain={chain} height={chartSize.height} theme={theme === 'light' ? 'light' : 'dark'} tokenAddress={token} width={chartSize.width} />
            <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              <Metric label="24H VOL" value={data?.volume?.h24 ? `$${Math.round(data.volume.h24).toLocaleString()}` : '—'} />
              <Metric label="LIQ" value={data?.liquidity?.usd ? `$${Math.round(data.liquidity.usd).toLocaleString()}` : '—'} />
              <Metric label="24H" value={typeof data?.priceChange?.h24 === 'number' ? `${data.priceChange.h24.toFixed(2)}%` : '—'} />
            </div>
          </div>
        ) : null}

        {showMedia ? <MediaBanner src={mediaSrc} type={mediaType} /> : null}
      </div>

      {platform === 'x' ? <OverlayDisclosure /> : <OverlayDisclosure />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div>{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}