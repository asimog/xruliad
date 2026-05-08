import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ht_owner';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function generateOwnerSession() {
  return randomBytes(24).toString('hex');
}

export async function getOwnerSessionFromCookie() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setOwnerSessionCookie(value: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export const OWNER_SESSION_COOKIE = COOKIE_NAME;
