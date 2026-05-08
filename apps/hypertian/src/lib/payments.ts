import { getSolanaDepositPaymentStatus } from '@/lib/solana';
import { getPaymentWithAd, listPendingPayments, verifyPayment } from '@/lib/supabase/queries';

export async function verifyPaymentRecord(paymentId: string) {
  const payment = await getPaymentWithAd(paymentId);
  if (!payment) {
    return {
      found: false as const,
    };
  }

  if (payment.status === 'verified') {
    return {
      found: true as const,
      payment,
      status: 'verified' as const,
      amountReceived: Number(payment.amount),
    };
  }

  if (!payment.deposit_address) {
    throw new Error('Payment is missing a deposit address.');
  }

  const status = await getSolanaDepositPaymentStatus({
    depositAddress: payment.deposit_address,
    amount: Number(payment.amount),
    currency: payment.currency,
  });

  if (!status.verified) {
    return {
      found: true as const,
      payment,
      status: 'pending' as const,
      amountReceived: status.amountReceived,
    };
  }

  // Use the transaction hash from the payment status if available, otherwise skip
  if (!status.txHash) {
    return {
      found: true as const,
      payment,
      status: 'pending' as const,
      amountReceived: status.amountReceived,
    };
  }

  const verifiedPayment = await verifyPayment({
    paymentId,
    txHash: status.txHash,
  });

  return {
    found: true as const,
    payment: verifiedPayment,
    status: 'verified' as const,
    amountReceived: status.amountReceived,
  };
}

export async function verifyPendingPaymentsBatch(limit = 25) {
  const pendingPayments = await listPendingPayments(limit);
  let verifiedCount = 0;
  const errors: string[] = [];

  for (const payment of pendingPayments) {
    try {
      const result = await verifyPaymentRecord(payment.id);
      if (result.found && result.status === 'verified') {
        verifiedCount += 1;
      }
    } catch (error) {
      errors.push(`${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    checked: pendingPayments.length,
    verified: verifiedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}
