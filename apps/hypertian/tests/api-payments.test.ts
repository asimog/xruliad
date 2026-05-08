import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyDirectPaymentForAd: vi.fn(),
  toPublicPaymentStatus: vi.fn(),
}));

vi.mock('@/lib/supabase/queries', () => ({
  verifyDirectPaymentForAd: mocks.verifyDirectPaymentForAd,
  toPublicPaymentStatus: mocks.toPublicPaymentStatus,
}));

const { POST } = await import('../src/app/api/payments/verify/route');

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/payments/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.toPublicPaymentStatus.mockImplementation(({ deposit_secret, ...payment }) => payment);
  });

  it('requires a submitted transaction signature', async () => {
    const response = await POST(jsonRequest({ paymentId: 'payment-1' }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Required');
    expect(mocks.verifyDirectPaymentForAd).not.toHaveBeenCalled();
  });

  it('requires either paymentId or adId', async () => {
    const response = await POST(jsonRequest({ txSignature: 'x'.repeat(88) }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('paymentId or adId');
    expect(mocks.verifyDirectPaymentForAd).not.toHaveBeenCalled();
  });

  it('returns active status for verified chart payments', async () => {
    mocks.verifyDirectPaymentForAd.mockResolvedValue({
      payment: {
        id: 'payment-1',
        amount: 0.001,
        currency: 'SOL',
        status: 'verified',
        deposit_address: 'wallet',
        deposit_secret: 'secret',
        verified_at: null,
        created_at: 'now',
      },
      ad: { id: 'ad-1', status: 'active' },
      status: 'active',
      amountReceived: 0.001,
    });

    const response = await POST(
      jsonRequest({
        paymentId: 'payment-1',
        txSignature: 'x'.repeat(88),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.verifyDirectPaymentForAd).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      txSignature: 'x'.repeat(88),
    });
    expect(json).toMatchObject({
      payment: {
        id: 'payment-1',
      },
      ad: {
        id: 'ad-1',
      },
      status: 'active',
      amountReceived: 0.001,
      reason: null,
    });
    expect(JSON.stringify(json)).not.toContain('deposit_secret');
  });
});
