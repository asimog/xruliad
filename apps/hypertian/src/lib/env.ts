import { z } from 'zod';

const optionalEnvString = (schema: z.ZodString) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalEnvString(z.string().url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalEnvString(z.string().min(1)),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalEnvString(z.string().min(1)),
  NEXT_PUBLIC_PRIVY_APP_ID: optionalEnvString(z.string().min(1)),
  NEXT_PUBLIC_SOLANA_RPC_URL: optionalEnvString(z.string().url()),
  NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA: optionalEnvString(z.string().min(32)),
  NEXT_PUBLIC_SITE_URL: optionalEnvString(z.string().url()),
  NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: optionalEnvString(z.string().url()),
});

const serverEnvSchema = publicEnvSchema.extend({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnvString(z.string().min(1)),
  PRIVY_APP_SECRET: optionalEnvString(z.string().min(1)),
  PRIVY_VERIFICATION_KEY: optionalEnvString(z.string()),
  HELIUS_RPC_URL: optionalEnvString(z.string().url()),
  CRON_SECRET: optionalEnvString(z.string().min(1)),
  OVERLAY_SIGNING_SECRET: optionalEnvString(z.string().min(1)),
  ESCROW_ENCRYPTION_SECRET: optionalEnvString(z.string().min(1)),
  FILEBASE_ACCESS_KEY_ID: optionalEnvString(z.string().min(1)),
  FILEBASE_SECRET_ACCESS_KEY: optionalEnvString(z.string().min(1)),
  FILEBASE_BUCKET: optionalEnvString(z.string().min(1)),
});

const filebaseEnvSchema = z.object({
  FILEBASE_ACCESS_KEY_ID: z.string().min(1),
  FILEBASE_SECRET_ACCESS_KEY: z.string().min(1),
  FILEBASE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: optionalEnvString(z.string().url()),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA: process.env.NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA: process.env.NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
    PRIVY_VERIFICATION_KEY: process.env.PRIVY_VERIFICATION_KEY,
    HELIUS_RPC_URL: process.env.HELIUS_RPC_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    OVERLAY_SIGNING_SECRET: process.env.OVERLAY_SIGNING_SECRET,
    ESCROW_ENCRYPTION_SECRET: process.env.ESCROW_ENCRYPTION_SECRET,
    FILEBASE_ACCESS_KEY_ID: process.env.FILEBASE_ACCESS_KEY_ID,
    FILEBASE_SECRET_ACCESS_KEY: process.env.FILEBASE_SECRET_ACCESS_KEY,
    FILEBASE_BUCKET: process.env.FILEBASE_BUCKET,
  });
}

export function getSolanaRpcUrl() {
  return process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  );
}

export function isPrivyEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
}

export function getSupabasePublishableKey(env = getPublicEnv()) {
  return env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function isSupabaseEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function isSupabaseAdminEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function isFilebaseEnabled() {
  return Boolean(process.env.FILEBASE_ACCESS_KEY_ID && process.env.FILEBASE_SECRET_ACCESS_KEY && process.env.FILEBASE_BUCKET);
}

export function getFilebaseEnv() {
  return filebaseEnvSchema.parse({
    FILEBASE_ACCESS_KEY_ID: process.env.FILEBASE_ACCESS_KEY_ID,
    FILEBASE_SECRET_ACCESS_KEY: process.env.FILEBASE_SECRET_ACCESS_KEY,
    FILEBASE_BUCKET: process.env.FILEBASE_BUCKET,
    NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL,
  });
}
