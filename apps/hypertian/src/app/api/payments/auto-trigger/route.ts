import { fail, ok } from '@/lib/http';
import { autoTriggerAndSweepPayment } from '@/lib/solana';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const schema = z.object({
  paymentId: z.string().uuid(),
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return fail('Unauthorized.', 401);
    }

    const body = schema.parse(await request.json());
    const supabase = createAdminClient();

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, ads(*)')
      .eq('id', body.paymentId)
      .single();

    if (paymentError || !payment) {
      return fail('Payment not found.', 404);
    }

    if (payment.status === 'verified') {
      return ok({ status: 'already_verified', paymentId: body.paymentId });
    }

    if (!payment.deposit_address || !payment.deposit_secret) {
      return fail('Payment missing deposit address or secret.', 400);
    }

    const ad = payment.ads;
    if (!ad || !ad.paid_to_wallet) {
      return fail('Ad or streamer wallet not found.', 400);
    }

    // Auto-trigger verification and sweep
    const result = await autoTriggerAndSweepPayment({
      paymentId: body.paymentId,
      depositAddress: payment.deposit_address,
      encryptedSecret: payment.deposit_secret,
      streamerWallet: ad.paid_to_wallet,
      platformTreasuryWallet: payment.platform_treasury_wallet,
      expectedAmount: Number(payment.amount),
      expectedPlatformFee: Number(payment.platform_fee_amount ?? 0),
    });

    if (!result.triggered) {
      return ok({
        status: 'pending',
        paymentId: body.paymentId,
        reason: result.reason,
        amountReceived: result.amountReceived,
      });
    }

    // Update payment status
    const now = new Date();
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        tx_hash: result.txHash,
        status: 'verified',
        verified_at: now.toISOString(),
      })
      .eq('id', body.paymentId);

    if (updateError) {
      return fail(updateError.message, 500);
    }

    // Update ad status
    const durationMinutes = Number(ad.duration_minutes ?? 5);
    const activation = {
      status: durationMinutes > 0 ? 'active' : 'pending_streamer_approval',
      isActive: durationMinutes > 0,
      startsAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationMinutes * 60000).toISOString(),
    };

    await supabase
      .from('ads')
      .update({
        payment_tx_signature: result.txHash,
        status: activation.status,
        is_active: activation.isActive,
        starts_at: activation.startsAt,
        expires_at: activation.expiresAt,
      })
      .eq('id', ad.id);

    return ok({
      status: 'swept',
      paymentId: body.paymentId,
      txHash: result.txHash,
      sweepResult: result.sweepResult,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to process payment.', 500);
  }
}