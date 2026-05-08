import { describe, expect, it } from 'vitest';
import { getPaymentRoute } from '../src/lib/payment-routing';

describe('payment routing', () => {
  it('routes X chart ads directly to the streamer with no commission', () => {
    expect(
      getPaymentRoute({
        adType: 'chart',
        platform: 'x',
        payoutWallet: 'streamer-wallet',
      amount: 0.001,
      escrowAddress: 'escrow-wallet',
      escrowSecret: 'secret',
      platformTreasuryWallet: 'treasury-wallet',
      }),
    ).toEqual({
      recipientKind: 'streamer_direct',
      depositAddress: 'streamer-wallet',
      depositSecret: null,
      paidToWallet: 'streamer-wallet',
      platformTreasuryWallet: null,
      commissionBps: 0,
      platformFeeAmount: 0,
      streamerAmount: 0.001,
    });
  });

  it('routes X banner ads through escrow with no commission', () => {
    expect(
      getPaymentRoute({
        adType: 'banner',
        platform: 'x',
        payoutWallet: 'streamer-wallet',
      amount: 0.001,
      escrowAddress: 'escrow-wallet',
      escrowSecret: 'secret',
      platformTreasuryWallet: 'treasury-wallet',
      }),
    ).toEqual({
      recipientKind: 'escrow',
      depositAddress: 'escrow-wallet',
      depositSecret: 'secret',
      paidToWallet: 'streamer-wallet',
      platformTreasuryWallet: null,
      commissionBps: 0,
      platformFeeAmount: 0,
      streamerAmount: 0.001,
    });
  });

  it('routes PumpFun chart ads through escrow to the deployer wallet with no commission', () => {
    expect(
      getPaymentRoute({
        adType: 'chart',
        platform: 'pump',
        payoutWallet: 'pump-deployer-wallet',
      amount: 0.001,
      escrowAddress: 'escrow-wallet',
      escrowSecret: 'secret',
      platformTreasuryWallet: 'treasury-wallet',
      }),
    ).toEqual({
      recipientKind: 'escrow',
      depositAddress: 'escrow-wallet',
      depositSecret: 'secret',
      paidToWallet: 'pump-deployer-wallet',
      platformTreasuryWallet: null,
      commissionBps: 0,
      platformFeeAmount: 0,
      streamerAmount: 0.001,
    });
  });

  it('requires an escrow address for escrowed routes', () => {
    expect(() =>
      getPaymentRoute({
        adType: 'banner',
        platform: 'x',
        payoutWallet: 'streamer-wallet',
        amount: 0.001,
      }),
    ).toThrow('Escrow payment route');
  });

  it('does not require a treasury wallet while commission is disabled', () => {
    expect(
      getPaymentRoute({
        adType: 'chart',
        platform: 'pump',
        payoutWallet: 'pump-deployer-wallet',
        amount: 0.001,
        escrowAddress: 'escrow-wallet',
        escrowSecret: 'secret',
      }).platformTreasuryWallet,
    ).toBeNull();
  });
});
