# Privy Phase 1

This repo now ships the client-side production scaffolding for Privy without MFA.

## Repo changes

- `components/auth/PrivyAppProvider.tsx` now mounts a real `PrivyProvider` when `NEXT_PUBLIC_PRIVY_APP_ID` is present.
- `app/login/page.tsx` now exposes a working Privy login/logout panel and shows the configured login methods, primary domain, and redirect URLs.
- `.env.local.example` and `.env.example.railway` now document the Privy variables needed to keep deployment config aligned with the dashboard.

## Dashboard checklist

Complete these steps in the Privy Dashboard before cutting over production:

1. Add only the production domain under allowed domains.
2. Remove local, preview, and stale test domains you do not want to authorize.
3. Verify domain ownership so HttpOnly cookies can be enabled.
4. Enable only the login methods listed in `NEXT_PUBLIC_PRIVY_LOGIN_METHODS`.
5. Add the exact OAuth redirect URLs listed in `NEXT_PUBLIC_PRIVY_ALLOWED_REDIRECT_URLS`.
6. Keep MFA disabled for now, per the current rollout decision.
7. Review session duration and shorten it from the default if creator access should expire sooner.

## Recommended production values

- `NEXT_PUBLIC_PRIVY_PRIMARY_DOMAIN=https://hypermyths.com`
- `NEXT_PUBLIC_PRIVY_ALLOWED_REDIRECT_URLS=https://hypermyths.com/login`
- `NEXT_PUBLIC_PRIVY_LOGIN_METHODS=email,google,wallet`
- `NEXT_PUBLIC_PRIVY_WALLET_CHAIN_TYPE=ethereum-only`

If you later enable Solana wallet login, Privy also requires
`config.externalWallets.solana.connectors` in the `PrivyProvider`.

## Remaining work after Phase 1

- Phase 2: enforce Privy authentication on private routes and private API endpoints server-side.
- Phase 3: ship CSP and the rest of the security header baseline in report-only mode first.
