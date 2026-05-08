# Local Trading

Trading execution stays local. The web can prepare, simulate, explain, and export execution intents, but it cannot place live user trades.

Implemented boundaries:

- `packages/local-trading`
- `packages/execution`
- `packages/risk`
- `packages/audit`
- `packages/strategy-vault`
- `services/local-execution-gateway`

Default mode is `web_prepare_only`. Live execution requires a local gateway, pairing token, local secrets, local risk policy, and explicit user approval.
