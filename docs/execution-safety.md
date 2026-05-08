# Execution Safety

Hard rules:

- No unrestricted autonomous live trading.
- No live user trading from Vercel or Railway.
- No user trading secrets in Supabase or public env vars.
- No wallet/key material sent to external inference.
- Execution requires explicit user approval.
- Default execution mode is `web_prepare_only`.

`services/local-execution-gateway` exposes the local-only contract for health, capabilities, policies, intent import, simulation, approval, rejection, execution, and audit.
