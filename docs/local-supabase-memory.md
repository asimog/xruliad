# Local Supabase Memory (MythVault)

## Purpose

Local Supabase acts as the private MythVault for operators running the HyperMyths Terminal locally or in hybrid mode. It stores:

- Private strategies
- Local trading memory
- Local execution intents
- User-local pay.sh receipt metadata (no secrets)
- QVAC private reasoning logs
- Local agent memory
- Local command/thesis drafts
- Local trade journals
- Private source material
- Private user settings

## Setup

1. Install Supabase CLI: `npm install -g supabase`
2. From repo root: `supabase start`
3. Copy env vars from Supabase CLI output to your `.env.local`

### Scripts

```bash
pnpm supabase:start       # Start local Supabase
pnpm supabase:stop        # Stop local Supabase
pnpm supabase:status      # Check local Supabase status
pnpm supabase:reset       # Reset local database
pnpm supabase:types       # Generate TypeScript types
pnpm memory:local:check   # Verify local memory is configured
pnpm memory:cloud:check   # Verify cloud memory is configured
pnpm memory:sync:test     # Test local-to-cloud sync boundary
```

### Required Env

```
LOCAL_SUPABASE_URL=http://127.0.0.1:54321
LOCAL_SUPABASE_ANON_KEY=eyJ...
LOCAL_SUPABASE_SERVICE_ROLE_KEY=eyJ...
LOCAL_SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
LOCAL_MEMORY_ENABLED=true
LOCAL_MEMORY_DEFAULT=true
MEMORY_MODE=hybrid
```

## Integration

- `@hypermyths/supabase` provides `createLocalSupabaseClient()`.
- `@hypermyths/agent-memory` routes private_strategy and local_only to local store via `chooseMemoryStore()`.
- `@hypermyths/memory-sync` handles local-to-cloud sync queue with approval requirements.
- QVAC reads local memory for private embeddings and reasoning.
- Local trading gateway writes execution intents to local Supabase.

## Security

- Local Supabase runs on the user's machine.
- No authentication required locally (trust localhost).
- Local service role key stays local.
- Never sync raw private strategies to cloud without encryption + approval.
