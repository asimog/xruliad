# RBM-Inspired Belief Engine

## Current State

### What exists
- `packages/inference-router`: routes inference tasks to providers (QVAC, OpenRouter, x402, pay.sh, etc.)
- `packages/paysh`: barrel export of payments, platform-payments, user-local-payments
- `packages/platform-payments`: `quotePlatformAction()`, `createPlatformReceipt()` for web platform paid actions
- `packages/user-local-payments`: `quoteUserLocalRequest()`, `approveUserLocalQuote()` for local private paid actions
- `packages/unified-feed`: unified feed with normalization, filtering, privacy modes
- `packages/command-protocol`: commands with status lifecycle
- `packages/thesis-engine`: theses with runs and contributions
- `packages/agent-memory`: memory routing, sync policies
- `packages/supabase`: cloud/local client factories

### What does NOT exist
- No `packages/belief-engine` — nothing tracks belief state/progress
- No `packages/openrouter` — no standalone OpenRouter package (just used inside inference-router)
- No `packages/byok` — no bring-your-own-key management
- No `services/hermes-worker` — no agent/job worker service
- No "RBM" or "belief" code anywhere in the repo

## Why This Is Inspiration Only

The original RBM repo is a Haskell machine learning model. We are NOT:
- Vendoring or porting the Haskell RBM code
- Running an actual Restricted Boltzmann Machine
- Implementing ML training algorithms

Instead, we borrow the **idea of visible learning/progress over time** and implement it as a practical TypeScript belief/progress engine.

## What the Belief Engine Does

A core concept: every job tracks how its thesis changes as new information arrives.

1. A user creates a belief (a structured hypothesis).
2. The system adds evidence, runs inference, optionally pays for external APIs.
3. Each step updates the belief's confidence, risk, and timeline.
4. Updates emit Unified Feed events.
5. The final output includes artifacts like reports, videos, ads, or local trade intents.

This provides a **visible learning loop** without ML.

## RBM-Inspired Metaphor

- **Belief** = a structured hypothesis (like "this market is mispriced")
- **BeliefUpdate** = a change in belief caused by evidence/inference/payment/simulation
- **BeliefTimeline** = the full sequence of updates (like "training epochs")
- **BeliefFrame** = a visual snapshot at a point in time (like "visible learning state")
- **Confidence** = 0.0-1.0 score tracking conviction over time
- **Evidence/CounterEvidence** = weighted factors that shift confidence
- **BeliefHeatmap** = visual summary of evidence categories (not actual weights)

## How Belief Snapshots Work

Each belief has:
- `initial_confidence` — starting conviction
- `current_confidence` — latest conviction after all evidence
- `risk_score` — perceived risk (0.0-1.0)
- Timeline of updates showing what changed confidence at each step
- Public safe summary for web feed
- Encrypted/private content for local jobs

Confidence formula:
```
new_confidence = clamp(
  current_confidence
  + evidence_weight * 0.1
  - counterevidence_weight * 0.1
  + model_confidence_adjustment * 0.05
  - risk_penalty * 0.1
  , 0.0, 1.0
)
```

## OpenRouter BYOK

Users provide their own OpenRouter API key. Three storage modes:
1. **Browser local** (default) — encrypted in browser localStorage, safest
2. **Ephemeral job** — passed to worker for one request, not stored
3. **Encrypted cloud** — optional, user explicitly opts in, encrypted before Supabase storage

Never: log the key, store in plaintext, write to feed, expose in any API response.

## pay.sh Simple Mode

Two payment planes preserved:
- **Platform pay.sh** — for web jobs (video, ads, intelligence). Transparent pricing.
- **User-local pay.sh** — for local/private jobs. Local secrets only.

Simplified user requirement: OpenRouter key + pay.sh config = ready to use the system.

## Integration Checklist

- [ ] docs/rbm-inspired-belief-engine.md
- [ ] packages/belief-engine (types, belief CRUD, scoring, evidence, timeline, feed, privacy, storage)
- [ ] Supabase belief migration (beliefs, belief_updates, belief_evidence, belief_frames, belief_artifacts)
- [ ] packages/openrouter (BYOK key handling, model quoting, inference execution)
- [ ] packages/byok (key storage mode: browser/ephemeral/encrypted-cloud)
- [ ] packages/paysh simple-mode helpers
- [ ] services/hermes-worker (belief CRUD, run, evidence, pay endpoints)
- [ ] Terminal routes: /setup, /beliefs, /demo/rbm-belief
- [ ] RBM-style visualization components
- [ ] Unified Feed integration (belief→feed events)
- [ ] Agent memory integration (belief→memory records)
- [ ] Command/thesis integration (link beliefs to commands/theses)
- [ ] Check scripts + tests
- [ ] Docs + env + README + MIGRATION_STATUS update
- [ ] Typecheck + build + validation

## Validation Checklist

- [ ] All new packages compile
- [ ] Belief migration SQL valid
- [ ] Setup route renders
- [ ] Beliefs route renders
- [ ] RBM demo route renders
- [ ] Belief updates emit feed events
- [ ] OpenRouter key handling avoids logging/storage
- [ ] pay.sh separation preserved
- [ ] pnpm install + typecheck + build pass
- [ ] All check scripts pass
