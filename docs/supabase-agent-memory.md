# Supabase Agent Memory + GitHub Agent Layer

## Current Memory/Storage State

Before this pass:
- `packages/supabase` exists as a minimal typed boundary with `readSupabaseStatus()` and forbidden-store lists.
- No `packages/agent-memory`, `vector-memory`, `github-agent`, `artifact-ledger`, `memory-sync` exist.
- No `supabase/migrations/` directory exists.
- Apps use their own Supabase client patterns (hypertian via `@supabase/ssr`, hypermyths via Prisma).
- No structured agent memory layer, no vector memory support, no GitHub agent integration.

## Current Supabase Usage

- HyperMyths: Prisma + `DATABASE_URL` (postgres) + S3 storage for video artifacts.
- Hypertian: `@supabase/ssr` + `@supabase/supabase-js` browser/server clients.
- CancerHawk: No direct Supabase integration in monorepo scope.
- HyperKaon/Polymyths: Scaffolded, no database layer yet.

## Final Memory Architecture

Cloud Supabase = web/shared memory for commands, theses, jobs, receipts, display artifacts.
Local Supabase = private MythVault for strategies, local trading, QVAC reasoning, user-local payments.
GitHub = code memory, PR ledger, generated artifact ledger.
QVAC = local/private embeddings and reasoning over local memory.

### What Must Remain Local/Private

- User trading keys
- Wallet private keys
- Exchange API secrets
- Raw private strategies (unless encrypted + user-approved)
- Local pay.sh private keys
- Unredacted sensitive medical/research notes
- Proprietary private code strategy
- Unapproved local QVAC reasoning logs

### What Can Sync To Web

- Public/shared commands and theses
- Command/thesis contributions
- Web jobs (video, ad, research, simulation, intelligence)
- Platform pay.sh receipts
- Web-safe inference receipts
- Public display artifacts
- Public reports and research blocks
- GitHub PR/task metadata
- Public generated artifacts metadata

## Table Plan

### Core identity/session
- `users_profile` — user profiles
- `terminal_sessions` — active terminal sessions
- `agent_profiles` — agent identity records
- `agent_sessions` — agent session state

### Agent memory
- `agent_memories` — structured memory entries
- `memory_chunks` — chunked text for RAG
- `memory_embeddings` — vector embeddings (pgvector)
- `agent_messages` — message history
- `agent_tasks` — task queue items
- `agent_runs` — run records
- `agent_run_steps` — step-level trace
- `agent_tools` — available tool registry
- `agent_artifacts` — generated outputs
- `agent_receipts` — payment/execution receipts
- `agent_audit_logs` — audit trail

### Commands
- `commands` — command records
- `command_runs` — execution runs
- `command_contributions` — user/agent contributions
- `command_permissions` — access control

### Theses
- `theses` — thesis records
- `thesis_runs` — execution runs
- `thesis_contributions` — contributions
- `thesis_evidence` — linked evidence
- `thesis_model_outputs` — model-generated outputs
- `thesis_simulations` — simulation results
- `thesis_media_artifacts` — generated media
- `thesis_ad_placements` — ad placement records
- `thesis_research_tasks` — research task links
- `thesis_execution_intents` — local trade intents

### Jobs
- `video_jobs` — HashMyth video jobs
- `ad_jobs` — Hypertian ad jobs
- `research_jobs` — CancerHawk/HyperKaon research
- `simulation_jobs` — Polymyths simulation
- `intelligence_jobs` — intelligence reports
- `coding_jobs` — code generation tasks
- `display_jobs` — display artifact jobs

### Payments/receipts
- `platform_payment_receipts` — transparent platform receipts
- `user_local_payment_receipts_metadata` — local receipt metadata (no secrets)
- `inference_receipts` — inference routing receipts
- `paid_api_receipts` — paid API call receipts
- `spend_policies` — configured spend limits
- `risk_policies` — execution risk policies

### Approvals/audit
- `approvals` — user/agent approval records
- `audit_logs` — system audit trail
- `privacy_events` — privacy routing events
- `redaction_events` — data redaction events

### GitHub/code
- `github_repos` — connected repositories
- `github_tasks` — GitHub agent tasks
- `github_branches` — created branches
- `github_commits` — agent-authored commits
- `github_pull_requests` — PR tracking
- `github_artifacts` — published artifacts
- `github_publish_events` — publish log

### Display/artifacts
- `display_artifacts` — display-ready artifacts
- `storage_artifacts` — Supabase Storage references
- `artifact_provenance` — artifact origin tracking

### Provider/config
- `provider_configs` — provider configuration
- `product_capabilities` — cached product capabilities
- `runtime_status_snapshots` — runtime health snapshots

## Migration Plan

1. Create `supabase/migrations/` directory with sequential numbered SQL files.
2. Migration 0001: core identity/session tables + pgvector extension.
3. Migration 0002: agent memory tables (memory, chunks, messages, tasks, runs, tools, artifacts, receipts, audit).
4. Migration 0003: commands + theses tables.
5. Migration 0004: jobs tables (video, ad, research, simulation, intelligence, coding, display).
6. Migration 0005: payments/receipts tables + approvals/audit tables.
7. Migration 0006: GitHub/code tables.
8. Migration 0007: display/storage artifacts + provider/config tables.
9. Migration 0008: RLS policies.

If pgvector extension is unavailable, migrations are guarded with `CREATE EXTENSION IF NOT EXISTS` and table creation proceeds without vector columns.

## RLS/Security Plan

See `docs/supabase-rls.md`.

Key principles:
- Users own their private records.
- Public records are readable by all.
- `local_only` records should not be inserted into cloud.
- Service role powers workers.
- Platform receipts can be public if configured.
- Trading keys, wallet private keys, local pay.sh secrets are BLOCKED from cloud tables.

## GitHub App Integration Plan

See `docs/github-agent.md`.

Key principles:
- GitHub App preferred over personal access tokens.
- Artifact publish mode: direct commit to allowed path on configured branch.
- Code edit mode: branch → commit → PR → wait for human approval.
- Path allowlist enforced for both modes.
- Protected paths: `.env*`, `secrets/**`, `private/**`, `keys/**`.
- No direct push to main for code edits.

## Validation Checklist

- [ ] packages/supabase compiles
- [ ] packages/agent-memory compiles
- [ ] packages/vector-memory compiles
- [ ] packages/github-agent compiles
- [ ] packages/artifact-ledger compiles
- [ ] packages/memory-sync compiles
- [ ] Supabase migrations exist for all planned tables
- [ ] RLS policies documented
- [ ] Local Supabase docs and scripts exist
- [ ] GitHub agent docs and package boundary exist
- [ ] Terminal /memory and /github routes exist
- [ ] Command/thesis runs write memory records
- [ ] Sensitive memory blocked from cloud by policy
- [ ] Service-role keys not in browser code
- [ ] Env examples updated
- [ ] Check scripts added
- [ ] README and MIGRATION_STATUS updated
- [ ] pnpm install + build pass
