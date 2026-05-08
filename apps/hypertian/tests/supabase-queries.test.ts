import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

const { verifyPayment } = await import('../src/lib/supabase/queries');

function makeSelectSingleResult<T>(data: T) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

describe('supabase payment queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the ad before marking the payment verified so cron can retry ad failures', async () => {
    const events: string[] = [];
    const payment = {
      id: 'payment-1',
      ad_id: 'ad-1',
      amount: 0.001,
      currency: 'SOL',
      status: 'pending',
      deposit_address: 'wallet',
      deposit_secret: 'secret',
      tx_hash: null,
      verified_at: null,
      created_at: 'now',
    };
    const ad = {
      id: 'ad-1',
      ad_type: 'chart',
      duration_minutes: 5,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      token_address: 'So11111111111111111111111111111111111111112',
      chain: 'solana',
      position: 'bottom-right',
      size: 'medium',
      is_active: false,
      created_at: 'now',
    };
    const verifiedPayment = { ...payment, status: 'verified', tx_hash: 'tx-1' };

    const from = vi.fn((table: string) => {
      if (table === 'payments' && from.mock.calls.filter(([name]) => name === 'payments').length === 1) {
        return makeSelectSingleResult(payment);
      }
      if (table === 'ads' && from.mock.calls.filter(([name]) => name === 'ads').length === 1) {
        return makeSelectSingleResult(ad);
      }
      if (table === 'ads') {
        return {
          update: vi.fn().mockImplementation(() => {
            events.push('ad-update');
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === 'payments') {
        return {
          update: vi.fn().mockImplementation(() => {
            events.push('payment-update');
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: verifiedPayment, error: null }),
                }),
              }),
            };
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mocks.createAdminClient.mockReturnValue({ from });

    const result = await verifyPayment({ paymentId: 'payment-1', txHash: 'tx-1' });

    expect(result).toBe(verifiedPayment);
    expect(events).toEqual(['ad-update', 'payment-update']);
  });

  it('leaves the payment pending when the ad activation update fails', async () => {
    const paymentUpdate = vi.fn();
    const payment = {
      id: 'payment-1',
      ad_id: 'ad-1',
      amount: 0.001,
      currency: 'SOL',
      status: 'pending',
      deposit_address: 'wallet',
      deposit_secret: 'secret',
      tx_hash: null,
      verified_at: null,
      created_at: 'now',
    };
    const ad = {
      id: 'ad-1',
      ad_type: 'chart',
      duration_minutes: 5,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      token_address: 'So11111111111111111111111111111111111111112',
      chain: 'solana',
      position: 'bottom-right',
      size: 'medium',
      is_active: false,
      created_at: 'now',
    };

    const from = vi.fn((table: string) => {
      if (table === 'payments' && from.mock.calls.filter(([name]) => name === 'payments').length === 1) {
        return makeSelectSingleResult(payment);
      }
      if (table === 'ads' && from.mock.calls.filter(([name]) => name === 'ads').length === 1) {
        return makeSelectSingleResult(ad);
      }
      if (table === 'ads') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: new Error('ad update failed') }),
          }),
        };
      }
      if (table === 'payments') {
        return { update: paymentUpdate };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mocks.createAdminClient.mockReturnValue({ from });

    await expect(verifyPayment({ paymentId: 'payment-1', txHash: 'tx-1' })).rejects.toThrow('ad update failed');
    expect(paymentUpdate).not.toHaveBeenCalled();
  });
});
