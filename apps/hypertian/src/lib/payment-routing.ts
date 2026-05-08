import { PUMPFUN_COMMISSION_BPS } from '@/lib/constants';
import { AdType, PaymentRecipientKind, StreamPlatform } from '@/lib/types';

export interface PaymentRouteInput {
  adType: AdType;
  platform: StreamPlatform;
  payoutWallet: string;
  amount: number;
  escrowAddress?: string | null;
  escrowSecret?: string | null;
  platformTreasuryWallet?: string | null;
}

export function calculateCommission(amount: number, commissionBps: number) {
  const platformFeeAmount = Number(((amount * commissionBps) / 10_000).toFixed(9));
  return {
    commissionBps,
    platformFeeAmount,
    streamerAmount: Number((amount - platformFeeAmount).toFixed(9)),
  };
}

export function getPaymentRoute(input: PaymentRouteInput) {
  const requiresEscrow = input.adType === 'banner' || input.platform === 'pump';
  const recipientKind: PaymentRecipientKind = requiresEscrow ? 'escrow' : 'streamer_direct';
  const commission = calculateCommission(input.amount, input.platform === 'pump' ? PUMPFUN_COMMISSION_BPS : 0);

  if (requiresEscrow && !input.escrowAddress) {
    throw new Error('Escrow payment route requires a generated escrow address.');
  }
  if (commission.commissionBps > 0 && !input.platformTreasuryWallet) {
    throw new Error('PumpFun commission requires NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA.');
  }

  return {
    recipientKind,
    depositAddress: requiresEscrow ? input.escrowAddress! : input.payoutWallet,
    depositSecret: requiresEscrow ? input.escrowSecret ?? null : null,
    paidToWallet: input.payoutWallet,
    platformTreasuryWallet: commission.commissionBps > 0 ? input.platformTreasuryWallet! : null,
    ...commission,
  };
}
