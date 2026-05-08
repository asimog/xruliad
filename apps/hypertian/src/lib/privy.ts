import 'server-only';
import { verifyAccessToken } from '@privy-io/node';
import { headers } from 'next/headers';
import { getServerEnv, isPrivyEnabled } from '@/lib/env';

async function readBearerToken() {
  return (await headers()).get('authorization')?.replace('Bearer ', '') || null;
}

export async function requirePrivyUser() {
  if (!isPrivyEnabled()) {
    throw new Error('Privy is not configured for this deployment.');
  }

  const authHeader = await readBearerToken();
  if (!authHeader) {
    throw new Error('Missing authorization header.');
  }

  const env = getServerEnv();
  const verificationKey = env.PRIVY_VERIFICATION_KEY || env.PRIVY_APP_SECRET;
  if (!env.NEXT_PUBLIC_PRIVY_APP_ID || !verificationKey) {
    throw new Error('Privy environment variables are incomplete.');
  }

  const claims = await verifyAccessToken({
    access_token: authHeader,
    app_id: env.NEXT_PUBLIC_PRIVY_APP_ID,
    verification_key: verificationKey,
  });
  return claims;
}

export async function getOptionalPrivyUser() {
  if (!isPrivyEnabled()) {
    return null;
  }

  const authHeader = await readBearerToken();
  if (!authHeader) {
    return null;
  }

  const env = getServerEnv();
  const verificationKey = env.PRIVY_VERIFICATION_KEY || env.PRIVY_APP_SECRET;
  if (!env.NEXT_PUBLIC_PRIVY_APP_ID || !verificationKey) {
    return null;
  }

  return verifyAccessToken({
    access_token: authHeader,
    app_id: env.NEXT_PUBLIC_PRIVY_APP_ID,
    verification_key: verificationKey,
  });
}
