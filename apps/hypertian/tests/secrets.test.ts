import { describe, expect, it, vi } from 'vitest';

describe('escrow secret encryption', () => {
  it('encrypts and decrypts escrow secrets', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-for-tests');
    const { encryptSecret, decryptSecret } = await import('../src/lib/secrets-core');

    const secret = JSON.stringify([1, 2, 3, 4]);
    const encrypted = encryptSecret(secret);

    expect(encrypted).toContain('enc:v1:');
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it('preserves legacy plaintext secrets for backward compatibility', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-for-tests');
    const { decryptSecret } = await import('../src/lib/secrets-core');

    const legacy = JSON.stringify([5, 6, 7, 8]);
    expect(decryptSecret(legacy)).toBe(legacy);
  });
});
