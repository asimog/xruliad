import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

function getOverlaySigningSecret() {
  const secret = process.env.OVERLAY_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Missing overlay signing secret.');
  }
  return secret;
}

export function createOverlayHeartbeatKey(streamId: string) {
  return createHmac('sha256', getOverlaySigningSecret()).update(streamId).digest('hex');
}

export function verifyOverlayHeartbeatKey(streamId: string, providedKey: string) {
  if (!providedKey || !/^[a-f0-9]{64}$/i.test(providedKey)) {
    return false;
  }

  const expectedKey = createOverlayHeartbeatKey(streamId);
  const expected = Buffer.from(expectedKey, 'hex');
  const received = Buffer.from(providedKey, 'hex');

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
