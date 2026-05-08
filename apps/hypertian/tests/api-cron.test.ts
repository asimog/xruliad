import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyPendingPaymentsBatch: vi.fn(),
}));

vi.mock('@/lib/payments', () => ({
  verifyPendingPaymentsBatch: mocks.verifyPendingPaymentsBatch,
}));

const { GET } = await import('../src/app/api/cron/payments/route');

const originalCronSecret = process.env.CRON_SECRET;

describe('/api/cron/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it('rejects missing or wrong bearer tokens before querying payments', async () => {
    const response = await GET(new Request('http://localhost/api/cron/payments'));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toContain('Unauthorized');
    expect(mocks.verifyPendingPaymentsBatch).not.toHaveBeenCalled();
  });

  it('runs the pending-payment batch with the production batch limit', async () => {
    mocks.verifyPendingPaymentsBatch.mockResolvedValue({ checked: 2, verified: 1 });

    const response = await GET(
      new Request('http://localhost/api/cron/payments', {
        headers: { Authorization: 'Bearer cron-secret' },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.verifyPendingPaymentsBatch).toHaveBeenCalledWith(25);
    expect(json).toEqual({
      status: 'ok',
      checked: 2,
      verified: 1,
    });
  });
});
