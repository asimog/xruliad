# Supabase for HyperMyths Monorepo

## Setup

### Cloud Supabase

1. Create a project at https://supabase.com
2. Set these env vars:
   ```
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### Local Supabase (MythVault)

1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. From repo root: `supabase start`
3. Set these env vars:
   ```
   LOCAL_SUPABASE_URL=http://127.0.0.1:54321
   LOCAL_SUPABASE_ANON_KEY=eyJ...
   LOCAL_SUPABASE_SERVICE_ROLE_KEY=eyJ...
   LOCAL_SUPABASE_DB_URL=postgresql://...
   ```

## Migrations

Run migrations (with Supabase CLI):
```
supabase db push          # push to linked remote
supabase migration up     # apply locally
```

## RLS Notes

All tables have RLS enabled. User-owned rows use `user_id = auth.uid()`. Public records use `visibility = 'public'`. Service role bypasses RLS.

## Memory Storage

- Cloud Supabase: web-safe commands, theses, jobs, platform receipts, public artifacts.
- Local Supabase: strategies, trading intents, QVAC logs, user-local receipts, private code.
- Forbidden from cloud tables: trading keys, wallet private keys, raw private strategies, unredacted medical data.

## Storage Buckets

Configure in Supabase dashboard:
- `public-artifacts` — public, read-only for anon
- `private-artifacts` — private, signed URLs only
- `video-assets` — private
- `agent-uploads` — private
