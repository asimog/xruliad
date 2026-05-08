# Product API

Implemented in `packages/product-api`.

Every product exposes or is being wired to:

- `GET /api/health`
- `GET /api/capabilities`
- `POST /api/agent/run`
- `POST /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/quote`
- `POST /api/execute`

Trading-related execute endpoints prepare/export local intents only.
