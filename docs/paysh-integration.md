# pay.sh Integration

There are two pay.sh planes:

- platform: `PLATFORM_PAYSH_*`, server-side, for web platform actions
- user-local: `USER_PAYSH_*`, local-only, for user/private paid actions

Existing `packages/payments` remains the generic pay.sh boundary. `packages/platform-payments`, `packages/user-local-payments`, and `packages/paysh` enforce the final split.
