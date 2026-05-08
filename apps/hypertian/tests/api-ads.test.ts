import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPairsByTokenAddress: vi.fn(),
  createAdWithDirectPayment: vi.fn(),
  getStreamById: vi.fn(),
  getUserByPrivyId: vi.fn(),
  getOptionalPrivyUser: vi.fn(),
  listActiveAdsForStream: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/dexscreener', () => ({
  getPairsByTokenAddress: mocks.getPairsByTokenAddress,
}));

vi.mock('@/lib/privy', () => ({
  getOptionalPrivyUser: mocks.getOptionalPrivyUser,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/supabase/queries', () => ({
  createAdWithDirectPayment: mocks.createAdWithDirectPayment,
  getStreamById: mocks.getStreamById,
  getUserByPrivyId: mocks.getUserByPrivyId,
  listActiveAdsForStream: mocks.listActiveAdsForStream,
}));

const { POST, GET } = await import('../src/app/api/ads/route');

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/ads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOptionalPrivyUser.mockResolvedValue(null);
    mocks.getUserByPrivyId.mockResolvedValue(null);
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it('creates public chart checkouts without advertiser auth', async () => {
    mocks.getPairsByTokenAddress.mockResolvedValue([{ pairAddress: 'pair-1' }]);
    mocks.createAdWithDirectPayment.mockResolvedValue({
      ad: { id: 'ad-1', ad_type: 'chart' },
      payment: { id: 'payment-1', currency: 'SOL', deposit_address: 'streamer-wallet' },
      stream: { payout_wallet: 'streamer-wallet' },
      amount: 0.001,
      durationMinutes: 5,
      paymentRoute: {
        recipientKind: 'streamer_direct',
        paidToWallet: 'streamer-wallet',
        commissionBps: 0,
        platformFeeAmount: 0,
        streamerAmount: 0.001,
        platformTreasuryWallet: null,
      },
    });

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'chart',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        chain: 'solana',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getPairsByTokenAddress).toHaveBeenCalledWith('solana', 'So11111111111111111111111111111111111111112');
    expect(mocks.createAdWithDirectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        adType: 'chart',
        dexPairAddress: 'pair-1',
        position: 'bottom-right',
        size: 'medium',
        streamId: 'stream-1',
      }),
    );
    expect(json).toMatchObject({
      paymentId: 'payment-1',
      amount: 0.001,
      recipientAddress: 'streamer-wallet',
      paymentRecipientKind: 'streamer_direct',
      commissionBps: 0,
      durationMinutes: 5,
    });
  });

  it('rejects chart ads before checkout when DexScreener has no pair', async () => {
    mocks.getPairsByTokenAddress.mockResolvedValue([]);

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'chart',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        chain: 'solana',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('No DexScreener pair');
    expect(mocks.createAdWithDirectPayment).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS banner URLs before checkout', async () => {
    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'banner',
        bannerUrl: 'http://example.com/banner.png',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('https://');
    expect(mocks.createAdWithDirectPayment).not.toHaveBeenCalled();
  });

  it('blocks public ad checkout creation when the write rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 1800 });

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'chart',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        chain: 'solana',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.error).toContain('Too many ad checkouts');
    expect(json.details).toEqual({ retryAfterSeconds: 1800 });
    expect(mocks.getPairsByTokenAddress).not.toHaveBeenCalled();
    expect(mocks.createAdWithDirectPayment).not.toHaveBeenCalled();
  });

  it('returns escrow deposit details for banner ad checkouts', async () => {
    mocks.createAdWithDirectPayment.mockResolvedValue({
      ad: { id: 'ad-1', ad_type: 'banner' },
      payment: { id: 'payment-1', currency: 'SOL', deposit_address: 'escrow-wallet' },
      stream: { payout_wallet: 'streamer-wallet' },
      amount: 0.001,
      durationMinutes: 5,
      paymentRoute: {
        recipientKind: 'escrow',
        paidToWallet: 'streamer-wallet',
        commissionBps: 0,
        platformFeeAmount: 0,
        streamerAmount: 0.001,
        platformTreasuryWallet: null,
      },
    });

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'banner',
        bannerUrl: 'https://example.com/banner.png',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createAdWithDirectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        adType: 'banner',
        bannerUrl: 'https://example.com/banner.png',
      }),
    );
    expect(json).toMatchObject({
      paymentId: 'payment-1',
      recipientAddress: 'escrow-wallet',
      depositAddress: 'escrow-wallet',
      paymentRecipientKind: 'escrow',
      paidToWallet: 'streamer-wallet',
      commissionBps: 0,
    });
  });

  it('attributes ad creation to the signed-in sponsor when auth is present', async () => {
    mocks.getPairsByTokenAddress.mockResolvedValue([{ pairAddress: 'pair-1' }]);
    mocks.getOptionalPrivyUser.mockResolvedValue({ user_id: 'privy-user-1' });
    mocks.getUserByPrivyId.mockResolvedValue({ id: 'user-1', wallet_address: 'wallet-1' });
    mocks.createAdWithDirectPayment.mockResolvedValue({
      ad: { id: 'ad-1', ad_type: 'chart' },
      payment: { id: 'payment-1', currency: 'SOL', deposit_address: 'streamer-wallet' },
      stream: { payout_wallet: 'streamer-wallet' },
      amount: 0.001,
      durationMinutes: 5,
      paymentRoute: {
        recipientKind: 'streamer_direct',
        paidToWallet: 'streamer-wallet',
        commissionBps: 0,
        platformFeeAmount: 0,
        streamerAmount: 0.001,
        platformTreasuryWallet: null,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
        body: JSON.stringify({
          streamId: 'stream-1',
          adType: 'chart',
          tokenAddress: 'So11111111111111111111111111111111111111112',
          chain: 'solana',
          position: 'bottom-right',
          size: 'medium',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createAdWithDirectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        sponsorId: 'user-1',
        sponsorWallet: 'wallet-1',
      }),
    );
  });

  it('maps approved banner ads to overlay media URLs', async () => {
    mocks.getStreamById.mockResolvedValue({ id: 'stream-1', default_banner_url: 'https://example.com/default.png' });
    mocks.listActiveAdsForStream.mockResolvedValue([
      {
        id: 'ad-1',
        ad_type: 'banner',
        banner_url: 'https://example.com/ad.png',
        status: 'active',
      },
      {
        id: 'ad-2',
        ad_type: 'chart',
        token_address: 'So11111111111111111111111111111111111111112',
        status: 'active',
      },
    ]);

    const response = await GET(new Request('http://localhost/api/ads?stream=stream-1'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ads).toEqual([
      expect.objectContaining({
        id: 'ad-1',
        media_src: 'https://example.com/ad.png',
        media_type: 'image',
      }),
      expect.objectContaining({
        id: 'ad-2',
        media_src: null,
        media_type: null,
      }),
    ]);
  });

  it('detects gif banner media for overlays', async () => {
    mocks.getStreamById.mockResolvedValue({ id: 'stream-1', default_banner_url: null });
    mocks.listActiveAdsForStream.mockResolvedValue([
      {
        id: 'ad-1',
        ad_type: 'banner',
        banner_url: 'https://example.com/ad.gif?cache=1',
        status: 'active',
      },
    ]);

    const response = await GET(new Request('http://localhost/api/ads?stream=stream-1'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ads[0]).toMatchObject({
      media_src: 'https://example.com/ad.gif?cache=1',
      media_type: 'gif',
    });
  });
});
