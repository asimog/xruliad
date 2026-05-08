import { describe, expect, it } from 'vitest';
import { assertHttpsUrl, assertSolanaWallet, isFreshHeartbeat, streamPlatformSchema } from '../src/lib/platform';

describe('platform helpers', () => {
  it('supports all v1 livestream platforms', () => {
    expect(['x', 'pump'].map((platform) => streamPlatformSchema.parse(platform))).toEqual([
      'x',
      'pump',
    ]);
    expect(() => streamPlatformSchema.parse('kick')).toThrow();
    expect(() => streamPlatformSchema.parse('twitch')).toThrow();
    expect(() => streamPlatformSchema.parse('youtube')).toThrow();
  });

  it('requires HTTPS banner and stream URLs', () => {
    expect(assertHttpsUrl('https://example.com/banner.png')).toBe('https://example.com/banner.png');
    expect(() => assertHttpsUrl('http://example.com/banner.png')).toThrow('https://');
    expect(() => assertHttpsUrl('not-a-url')).toThrow('valid URL');
  });

  it('treats heartbeats as fresh for the minute cadence grace window', () => {
    const now = Date.now();
    expect(isFreshHeartbeat(new Date(now - 89_000).toISOString(), now)).toBe(true);
    expect(isFreshHeartbeat(new Date(now - 91_000).toISOString(), now)).toBe(false);
  });

  it('validates Solana wallet addresses', () => {
    expect(assertSolanaWallet('11111111111111111111111111111111')).toBe('11111111111111111111111111111111');
    expect(() => assertSolanaWallet('not-a-wallet')).toThrow('valid Solana wallet');
  });
});
