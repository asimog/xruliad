# Yellow Verification Gap Fix Plan

Date: 2026-05-07

## Verified Gaps

| # | Gap | Status |
|---|-----|--------|
| 1 | Supabase CRUD persistence helpers incomplete | ALREADY COMPLETE — all helpers exist in `packages/supabase/src/persistence.ts` (486 lines, 15+ helpers) |
| 2 | Admin dashboard not mounted in all apps | NEEDS: polymyths, cancerhawk, hyperkaon |
| 3 | QVAC only has health checks; missing chat/embed | NEEDS: qvacChat(), qvacEmbed() |
| 4 | hypercinema/hypermyths Next.js 16 params-as-Promise errors | NEEDS: 17 route files still use old `context.params.id` pattern |
| 5 | Missing root scripts: deploy:check, execution:safety:test | NEEDS: scripts and package.json entries |
| 6 | Encrypt/Ika env-configurable devnet IDs | OPTIONAL — add env helpers |

## Files to Edit

### Gap 1: Supabase Persistence (ALREADY DONE)
- `packages/supabase/src/persistence.ts` — all 15+ CRUD helpers exist ✅

### Gap 2: Hermes Worker Persistence Wiring
- `services/hermes-worker/package.json` — add `@hypermyths/supabase` dependency
- `services/hermes-worker/src/server.ts` — import and wire persistence to endpoints

### Gap 3: Admin Dashboard Mount
- `apps/polymyths/app/admin/page.tsx` — create
- `apps/cancerhawk/pages/admin.tsx` — create (Pages Router)
- `apps/hyperkaon/app/admin/page.tsx` — create

### Gap 4: QVAC Chat/Embed
- `packages/qvac/src/index.ts` — add qvacChat(), qvacEmbed()
- `packages/qvac/src/check.ts` — update check output

### Gap 5: Hypercinema Params Fix
17 files in `apps/hypermyths/app/api/` need Promise params pattern:
- `api/commands/[id]/route.ts` + 6 sub-routes
- `api/theses/[id]/route.ts` + 8 sub-routes
- `api/display/[id]/route.ts`

### Gap 6: Root Scripts
- `package.json` — add deploy:check, execution:safety:test
- `scripts/deploy-check.ts` — create
- `scripts/execution-safety-test.ts` — create
- `packages/execution/package.json` — add "check" script

### Gap 7: Encrypt/Ika Env Helpers (OPTIONAL)
- `packages/encrypt/src/index.ts` — add readEncryptConfig(), encryptStatus()
- `packages/ika/src/index.ts` — add readIkaConfig(), ikaStatus()

## Safety Constraints
- Do not expose service role key to browser
- Do not store wallet/private keys in Supabase
- Do not break 82/82 build
- Do not break HashMyth
- Do not break Hermes worker
- Do not change trading safety

## Implementation Order
1. Wire Hermes worker to persistence (add dep + import)
2. Mount admin in remaining apps
3. Add QVAC chat/embed
4. Fix hypercinema params-as-Promise
5. Add root scripts
6. Optional: Encrypt/Ika env
7. Update docs
8. Run build + typecheck

## Validation Commands
```
pnpm install
pnpm build
pnpm typecheck
pnpm --filter @hypermyths/hermes-worker typecheck
pnpm admin:check
pnpm qvac:check
pnpm deploy:check
pnpm execution:safety:test
```

## Rollback
- All changes are additive; no existing behavior is removed
- Persistence helpers gracefully degrade when Supabase unconfigured
- Admin pages are optional UI mounts
- QVAC chat/embed return clear disabled states
