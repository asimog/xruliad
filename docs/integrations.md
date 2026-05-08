# Integrations

## pay.sh

`packages/payments` provides `PayShClient`, request quoting, paid request execution through the `pay` CLI, 402/payment challenge handling, spend-limit checks, and in-memory usage tracking for the first pass.

Required live env:

- `PAYSH_API_BASE_URL`
- `PAYSH_WALLET_PRIVATE_KEY`
- `PAYSH_NETWORK`
- `PAYSH_DEFAULT_CURRENCY`
- `PAYSH_MAX_REQUEST_COST`
- `PAYSH_DAILY_SPEND_LIMIT`

Existing HyperMyths `PAY_SH_*` variables are supported as migration aliases where practical. Production code must use real pay.sh boundaries; mocks belong only in tests.

## MiroShark

`packages/simulation` provides an external MiroShark boundary. The local `apps/cancerhawk/MiroShark` folder copied from the source is empty, so the monorepo does not vendor MiroShark.

Required live env:

- `MIROSHARK_BASE_URL`
- `MIROSHARK_API_KEY`
- `MIROSHARK_DOCKER_ENABLED`
- `MIROSHARK_DEFAULT_MODEL`
- `MIROSHARK_MAX_AGENTS`
- `MIROSHARK_MAX_SIMULATION_HOURS`

The upstream project requires Python, Node, Neo4j, and either local/Docker or cloud API setup.

## moto / fstack

`packages/agents` treats buildingopen/moto as the agent control-plane boundary. The GitHub URL currently redirects to `floomhq/moto` / fstack.

Required env:

- `MOTO_BASE_PATH`
- `MOTO_DOCKER_ENABLED`
- `MOTO_DEFAULT_AGENT`
- `MOTO_LOG_LEVEL`

Run:

```bash
pnpm paysh:check
pnpm miroshark:check
pnpm moto:check
```
