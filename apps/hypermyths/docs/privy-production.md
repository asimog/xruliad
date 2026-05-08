# Privy Production Rollout

This repo now includes the code-side pieces for every Privy production phase we can safely automate from source control.

## Phase 0

Repo support:

- `npm run secrets:scan` scans tracked files for known Privy secret formats.
- `.github/workflows/security-checks.yml` runs that scan on pushes and pull requests.
- `.env.local.example` and `.env.example.railway` now document the server-side Privy secrets and CSP toggles required for production.

Manual work still required:

1. Rotate any previously exposed credentials.
2. Remove live secrets from local env files that should not persist on disk.
3. Set `PRIVY_APP_SECRET` and `PRIVY_JWT_VERIFICATION_KEY` only in deployment environments.

## Phase 1

Repo support:

- `components/auth/PrivyAppProvider.tsx` mounts the real Privy provider.
- `components/auth/PrivyAccessPanel.tsx` and `app/login/page.tsx` expose the login UI and deployment metadata.
- `components/auth/PrivyProtected.tsx` gates the private creator UI.

Manual work still required:

1. Add only the production domain to Privy allowed domains.
2. Verify domain ownership and enable HttpOnly cookies.
3. Enable only the login methods listed in `NEXT_PUBLIC_PRIVY_LOGIN_METHODS`.
4. Configure the exact OAuth redirect URLs listed in `NEXT_PUBLIC_PRIVY_ALLOWED_REDIRECT_URLS`.

## Phase 2

Repo support:

- `app/api/video/create/route.ts` now requires a verified Privy access token.
- `app/api/jobs/route.ts` requires Privy auth for private job creation.
- Private jobs are stored with `visibility: private`, `pricingMode: private`, and the authenticated `creatorId`.
- `app/api/jobs/[jobId]/route.ts`, `app/api/video/[jobId]/route.ts`, and `app/api/report/[jobId]/route.ts` enforce owner-only access for private jobs.
- `components/job/JobPageClient.tsx` sends Privy access tokens when polling protected job routes and downloads private report/video assets without exposing them publicly.

## Phase 3

Repo support:

- `next.config.ts` now sets a production security-header baseline.
- CSP ships in report-only mode by default through `CSP_REPORT_ONLY=true`.
- Enforcement can be enabled later with `CSP_ENFORCE=true`.
- `CSP_REPORT_URI` can be set to collect violation reports externally.

Recommended rollout:

1. Deploy with report-only enabled.
2. Review violations from Privy, WalletConnect, YouTube, Supabase, and any browser extensions.
3. Add missing allowlisted origins deliberately.
4. Enable `CSP_ENFORCE=true` only after the report-only stream is clean.

## Phase 4

Repo support:

- Existing rate limits remain in place for public and private creation routes.
- Auth failures and private-job authorization mismatches are logged server-side in `lib/auth/privy-server.ts` and `lib/auth/private-job-access.ts`.

Manual work still required:

1. Add alerting on repeated auth failures and unusual private-route volume.
2. Review dashboard session duration and reduce it if the studio should expire faster than Privy defaults.
3. Turn on HttpOnly cookies in Privy after domain verification so browser-native asset requests stay authenticated without bearer tokens.

## Suggested production env values

```dotenv
NEXT_PUBLIC_PRIVY_PRIMARY_DOMAIN=https://hypermyths.com
NEXT_PUBLIC_PRIVY_ALLOWED_REDIRECT_URLS=https://hypermyths.com/login
NEXT_PUBLIC_PRIVY_LOGIN_METHODS=email,google,wallet
NEXT_PUBLIC_PRIVY_WALLET_CHAIN_TYPE=ethereum-only
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PRIVY_JWT_VERIFICATION_KEY=...
CSP_REPORT_ONLY=true
CSP_ENFORCE=false
```

If you want Solana wallet login later, add Privy's Solana connector setup to
`config.externalWallets.solana.connectors` before switching the chain type to
`solana-only` or `ethereum-and-solana`.
