# Supabase RLS Policy Plan

## Principles

1. **User-owned data**: every table with `user_id` allows that user to read/write/delete their own rows.
2. **Public reads**: records with `visibility = 'public'` are selectable by anyone.
3. **Service role**: the service role key bypasses RLS entirely (for workers).
4. **No key material in cloud**: trading keys, wallet private keys, local pay.sh secrets must never be stored in cloud tables.
5. **Local-only records**: visibility `local_only` should never be inserted into cloud Supabase.

## What Is Protected

- All user data: visible only to the owning user.
- All financial/trading records: RLS prevents cross-user access.
- All private strategies: only the owning user.
- Agent sessions and tools: per-agent scoping.

## What Can Be Public

- `platform_payment_receipts` with `receipt_public = true`.
- Public theses and commands with `visibility = 'public'`.
- Display artifacts with `visibility = 'public'`.
- Publicly published research blocks and intelligence reports.
- GitHub artifact metadata for public repos.

## What Is Local-Only

- Local execution intents (`thesis_execution_intents` with `mode = 'local_*'`): store in local Supabase, not cloud.
- User-local payment receipts: metadata only in cloud, not the actual secrets.
- QVAC reasoning logs: stay local unless user explicitly approves sync.
- Private strategy vault data: local Supabase by default.

## What Requires Encryption

- Private strategy content synced to cloud (must be encrypted + user-approved).
- Sensitive medical/research notes (must be redacted or encrypted).
- Proprietary code strategies (can store encrypted in cloud with approval).

## Service Role Usage Rules

- Workers use service role key server-side only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser or `NEXT_PUBLIC_*` env.
- Node.js services (Railway/terminal-api/workers) register as service role.
- Browser clients use anon key only.

## RLS Policies

Applied via migration `0008_rls_policies.sql`:
1. `user_owns_data` on each table: `user_id = auth.uid()`
2. `public_read` on tables with `visibility` column: `visibility = 'public'`

Future refinement:
- Contributor policies for `command_contributions` and `thesis_contributions`.
- Agent-scoped policies for `agent_memories` (agent_id match).
- GitHub repo-scoped policies for `github_tasks` (repo ownership).
