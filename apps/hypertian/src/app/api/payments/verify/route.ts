import { fail, ok } from '@/lib/http';
import { toPublicPaymentStatus, verifyDirectPaymentForAd } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  paymentId: z.string().min(1).optional(),
  adId: z.string().min(1).optional(),
  txSignature: z.string().min(32),
}).refine((value) => value.paymentId || value.adId, {
  message: 'paymentId or adId is required.',
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await verifyDirectPaymentForAd(body);

    return ok({
      payment: toPublicPaymentStatus(result.payment),
      ad: {
        id: result.ad.id,
        status: result.ad.status,
        adType: result.ad.ad_type,
        isActive: result.ad.is_active,
        expiresAt: result.ad.expires_at,
      },
      status: result.status,
      amountReceived: result.amountReceived,
      sweepTxHash: 'sweepTxHash' in result ? result.sweepTxHash ?? null : null,
      reason: 'reason' in result ? result.reason : null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to verify payment.', 400);
  }
}
