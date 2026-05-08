# Local Supabase (MythVault)

## Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Get local keys
supabase status
```

## Env

Add the output from `supabase status` to your `.env.local`:
```
LOCAL_SUPABASE_URL=http://127.0.0.1:54321
LOCAL_SUPABASE_ANON_KEY=eyJ...
LOCAL_SUPABASE_SERVICE_ROLE_KEY=eyJ...
LOCAL_MEMORY_ENABLED=true
MEMORY_MODE=hybrid
```

## Migrations

```bash
supabase db push
```

## Status Check

```bash
pnpm memory:local:check
```
