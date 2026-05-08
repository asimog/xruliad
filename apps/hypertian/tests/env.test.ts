import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFilebaseEnv, getPublicEnv, getSolanaRpcUrl, isFilebaseEnabled } from '../src/lib/env';

const originalEnv = process.env;
const envKeys = [
  'HELIUS_RPC_URL',
  'NEXT_PUBLIC_SOLANA_RPC_URL',
  'FILEBASE_ACCESS_KEY_ID',
  'FILEBASE_SECRET_ACCESS_KEY',
  'FILEBASE_BUCKET',
  'NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_PRIVY_APP_ID',
] as const;

describe('environment helpers', () => {
  beforeEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads Solana RPC config without requiring unrelated server env', () => {
    expect(getSolanaRpcUrl()).toBe('https://api.mainnet-beta.solana.com');

    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://example-rpc.test';
    expect(getSolanaRpcUrl()).toBe('https://example-rpc.test');

    process.env.HELIUS_RPC_URL = 'https://helius-rpc.test';
    expect(getSolanaRpcUrl()).toBe('https://helius-rpc.test');
  });

  it('keeps Filebase upload configuration scoped to Filebase variables', () => {
    expect(isFilebaseEnabled()).toBe(false);

    process.env.FILEBASE_ACCESS_KEY_ID = 'access-key';
    process.env.FILEBASE_SECRET_ACCESS_KEY = 'secret-key';
    process.env.FILEBASE_BUCKET = 'hypertian';
    process.env.NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL = 'https://hypertian.s3.filebase.com';

    expect(isFilebaseEnabled()).toBe(true);
    expect(getFilebaseEnv()).toMatchObject({
      FILEBASE_ACCESS_KEY_ID: 'access-key',
      FILEBASE_SECRET_ACCESS_KEY: 'secret-key',
      FILEBASE_BUCKET: 'hypertian',
      NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: 'https://hypertian.s3.filebase.com',
    });
  });

  it('treats blank optional public env values as disabled', () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = '';

    expect(getPublicEnv().NEXT_PUBLIC_PRIVY_APP_ID).toBeUndefined();
  });
});
