import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AD_PRICE_SOL, DEFAULT_CHART_TOKEN_ADDRESS } from '../src/lib/constants';

const mocks = vi.hoisted(() => ({
  createAnonymousStream: vi.fn(),
  generateOwnerSession: vi.fn(),
  getOwnerSessionFromCookie: vi.fn(),
  getSiteUrl: vi.fn(),
  listOwnerPendingBannerAds: vi.fn(),
  listStreamsByOwnerSession: vi.fn(),
  setOwnerSessionCookie: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getSiteUrl: mocks.getSiteUrl,
}));

vi.mock('@/lib/overlay-auth', () => ({
  createOverlayHeartbeatKey: (streamId: string) => `key-for-${streamId}`,
}));

vi.mock('@/lib/owner-session', () => ({
  generateOwnerSession: mocks.generateOwnerSession,
  getOwnerSessionFromCookie: mocks.getOwnerSessionFromCookie,
  setOwnerSessionCookie: mocks.setOwnerSessionCookie,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/supabase/anon-queries', () => ({
  createAnonymousStream: mocks.createAnonymousStream,
  listOwnerPendingBannerAds: mocks.listOwnerPendingBannerAds,
  listStreamsByOwnerSession: mocks.listStreamsByOwnerSession,
}));

const { GET, POST } = await import('../src/app/api/public/streams/route');

const WALLET = '11111111111111111111111111111111';
const PUMP_MINT = 'PumpMint1111111111111111111111111111111111';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/public/streams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/public/streams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateOwnerSession.mockReturnValue('owner-session-1');
    mocks.getOwnerSessionFromCookie.mockResolvedValue(null);
    mocks.getSiteUrl.mockReturnValue('https://hypertian.com');
    mocks.listOwnerPendingBannerAds.mockResolvedValue([]);
    mocks.listStreamsByOwnerSession.mockResolvedValue([]);
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.createAnonymousStream.mockImplementation(async (input) => ({
      id: 'stream-1',
      ...input,
    }));
  });

  it('creates an X stream with the built-in default chart CA when none is supplied', async () => {
    const response = await POST(
      jsonRequest({
        platform: 'x',
        displayName: 'HyperTianX',
        profileUrl: 'https://x.com/HyperMythX',
        streamUrl: 'https://x.com/HyperMythX/status/1',
        payoutWallet: WALLET,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.setOwnerSessionCookie).toHaveBeenCalledWith('owner-session-1');
    expect(mocks.createAnonymousStream).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerSession: 'owner-session-1',
        platform: 'x',
        payoutWallet: WALLET,
        priceSol: DEFAULT_AD_PRICE_SOL,
        defaultBannerUrl: null,
        defaultChartTokenAddress: DEFAULT_CHART_TOKEN_ADDRESS,
        pumpMint: null,
        pumpDeployerWallet: null,
      }),
    );
    expect(json.overlayUrl).toBe('https://hypertian.com/overlay/stream-1?key=key-for-stream-1');
  });

  it('preserves a custom X default chart CA', async () => {
    const customCa = 'CustomToken11111111111111111111111111111111';

    const response = await POST(
      jsonRequest({
        platform: 'x',
        displayName: 'HyperTianX',
        profileUrl: 'https://x.com/HyperMythX',
        streamUrl: 'https://x.com/HyperMythX/status/1',
        payoutWallet: WALLET,
        defaultChartTokenAddress: customCa,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createAnonymousStream).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultChartTokenAddress: customCa,
      }),
    );
  });

  it('requires Pump streams to provide their mint so the default chart is the streamer chart', async () => {
    const response = await POST(
      jsonRequest({
        platform: 'pump',
        displayName: 'Pump Stream',
        profileUrl: 'https://pump.fun/coin/example',
        streamUrl: 'https://pump.fun/coin/example',
        pumpDeployerWallet: WALLET,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Pump token mint is required');
    expect(mocks.createAnonymousStream).not.toHaveBeenCalled();
  });

  it('blocks stream creation when the public write rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 3600 });

    const response = await POST(
      jsonRequest({
        platform: 'x',
        displayName: 'HyperTianX',
        profileUrl: 'https://x.com/HyperMythX',
        streamUrl: 'https://x.com/HyperMythX/status/1',
        payoutWallet: WALLET,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.error).toContain('Too many stream profiles');
    expect(json.details).toEqual({ retryAfterSeconds: 3600 });
    expect(mocks.createAnonymousStream).not.toHaveBeenCalled();
    expect(mocks.setOwnerSessionCookie).not.toHaveBeenCalled();
  });

  it('uses the Pump mint as both pumpMint and defaultChartTokenAddress', async () => {
    const response = await POST(
      jsonRequest({
        platform: 'pump',
        displayName: 'Pump Stream',
        profileUrl: 'https://pump.fun/coin/example',
        streamUrl: 'https://pump.fun/coin/example',
        pumpMint: PUMP_MINT,
        pumpDeployerWallet: WALLET,
        defaultChartTokenAddress: 'ignored-for-pump',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createAnonymousStream).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'pump',
        payoutWallet: WALLET,
        pumpDeployerWallet: WALLET,
        pumpMint: PUMP_MINT,
        defaultChartTokenAddress: PUMP_MINT,
      }),
    );
  });

  it('returns owner streams with overlay URLs and pending banner ads', async () => {
    mocks.getOwnerSessionFromCookie.mockResolvedValue('owner-session-1');
    mocks.listStreamsByOwnerSession.mockResolvedValue([{ id: 'stream-1', display_name: 'Live' }]);
    mocks.listOwnerPendingBannerAds.mockResolvedValue([{ id: 'ad-1', ad_type: 'banner' }]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.streams[0]).toMatchObject({
      id: 'stream-1',
      overlayUrl: 'https://hypertian.com/overlay/stream-1?key=key-for-stream-1',
    });
    expect(json.pendingAds).toEqual([{ id: 'ad-1', ad_type: 'banner' }]);
  });
});
