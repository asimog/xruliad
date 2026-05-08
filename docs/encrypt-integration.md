# Encrypt Integration

Encrypt is hackathon-critical for sealed/private strategy records and encrypted thesis payloads.

Implemented:

- `packages/encrypt`
- `packages/strategy-vault`

Current behavior is honest fallback. If `ENCRYPT_ENABLED=true`, `ENCRYPT_RPC_URL`, and `ENCRYPT_PROGRAM_ID` are configured, the boundary reports real devnet readiness. Otherwise it uses local fallback and labels it as such.
