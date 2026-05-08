import { DEFAULT_AD_DURATION_MINUTES } from '@/lib/constants';
import { AdStatus, AdType } from '@/lib/types';

export interface PaidAdStateInput {
  adType?: AdType | string | null;
  durationMinutes?: number | null;
  existingExpiresAt?: string | null;
  now?: Date;
}

export function getPaidAdActivationState(input: PaidAdStateInput) {
  const now = input.now ?? new Date();
  const status: AdStatus = input.adType === 'banner' ? 'pending_streamer_approval' : 'active';
  const durationMinutes = Number(input.durationMinutes ?? DEFAULT_AD_DURATION_MINUTES);

  return {
    status,
    isActive: status === 'active',
    startsAt: status === 'active' ? now.toISOString() : null,
    expiresAt:
      status === 'active'
        ? new Date(now.getTime() + durationMinutes * 60_000).toISOString()
        : input.existingExpiresAt ?? null,
  };
}

export function getBannerReviewState(input: {
  decision: 'approved' | 'rejected';
  durationMinutes?: number | null;
  existingExpiresAt?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const approved = input.decision === 'approved';
  const durationMinutes = Number(input.durationMinutes ?? DEFAULT_AD_DURATION_MINUTES);
  const status: AdStatus = approved ? 'active' : 'rejected';

  return {
    status,
    isActive: approved,
    startsAt: approved ? now.toISOString() : null,
    expiresAt: approved
      ? new Date(now.getTime() + durationMinutes * 60_000).toISOString()
      : input.existingExpiresAt ?? null,
  };
}
