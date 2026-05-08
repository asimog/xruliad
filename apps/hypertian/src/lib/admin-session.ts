import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ht_admin';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function adminSecret() {
  return process.env.ADMIN_PASSWORD || '';
}

function adminSignature(payload: string) {
  const secret = process.env.OVERLAY_SIGNING_SECRET || adminSecret() || 'admin-fallback';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function isAdminConfigured() {
  return Boolean(adminSecret());
}

export function checkAdminPassword(input: string) {
  const expected = adminSecret();
  if (!expected) {
    return false;
  }

  const expectedBuf = Buffer.from(expected);
  const inputBuf = Buffer.from(input ?? '');
  if (expectedBuf.length !== inputBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, inputBuf);
}

export function buildAdminCookieValue() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${adminSignature(issuedAt)}`;
}

export async function setAdminSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, buildAdminCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  if (!isAdminConfigured()) {
    return false;
  }

  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) {
    return false;
  }

  const [issuedAt, signature] = raw.split('.', 2);
  if (!issuedAt || !signature) {
    return false;
  }

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) {
    return false;
  }
  if (Date.now() - issuedAtMs > COOKIE_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expected = adminSignature(issuedAt);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);
  if (expectedBuf.length !== sigBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, sigBuf);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
