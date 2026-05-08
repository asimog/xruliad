# User-Local Payments

User-local payments are local-only and are used for private/user-controlled paid APIs, trading-related paid calls, and user agent purchases.

Implemented:

- `packages/user-local-payments`
- `packages/paysh`
- `packages/x402-discovery`
- `services/local-payments-gateway`

Required env uses `USER_PAYSH_*`. User-local private keys must not be stored in Supabase, Vercel, or Railway.
