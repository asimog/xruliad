import { describe, expect, it } from 'vitest';
import { getBannerReviewState, getPaidAdActivationState } from '../src/lib/ad-state';

describe('ad state transitions', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');

  it('activates paid chart ads immediately for the configured duration', () => {
    expect(getPaidAdActivationState({ adType: 'chart', durationMinutes: 5, now })).toEqual({
      status: 'active',
      isActive: true,
      startsAt: '2026-04-24T12:00:00.000Z',
      expiresAt: '2026-04-24T12:05:00.000Z',
    });
  });

  it('keeps paid banner ads pending until streamer approval', () => {
    expect(
      getPaidAdActivationState({
        adType: 'banner',
        durationMinutes: 5,
        existingExpiresAt: '2026-04-24T13:00:00.000Z',
        now,
      }),
    ).toEqual({
      status: 'pending_streamer_approval',
      isActive: false,
      startsAt: null,
      expiresAt: '2026-04-24T13:00:00.000Z',
    });
  });

  it('starts the five minute window only when a banner is approved', () => {
    expect(getBannerReviewState({ decision: 'approved', durationMinutes: 5, now })).toEqual({
      status: 'active',
      isActive: true,
      startsAt: '2026-04-24T12:00:00.000Z',
      expiresAt: '2026-04-24T12:05:00.000Z',
    });
  });

  it('rejects banners without activating or moving expiry', () => {
    expect(
      getBannerReviewState({
        decision: 'rejected',
        existingExpiresAt: '2026-04-24T13:00:00.000Z',
        now,
      }),
    ).toEqual({
      status: 'rejected',
      isActive: false,
      startsAt: null,
      expiresAt: '2026-04-24T13:00:00.000Z',
    });
  });
});
