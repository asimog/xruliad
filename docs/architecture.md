# Architecture

The monorepo is organized around Hyper Flow Interface Assembly: big boxes with named jobs and clean interfaces.

- `apps/*`: independently deployable branded frontends.
- `packages/*`: shared reusable code, product tokens, visual system, intelligence, payments, simulation, and platform primitives.
- `services/*`: backend and worker process boundaries.
- `infra/*`: deployment, database, Docker, pay.sh, MiroShark, and moto/fstack notes.
- `docs/*`: operating map for humans and agents.

The shared backend/platform layer should not require brand collapse. Apps use shared packages where it reduces duplication, while app-specific product identity and routes remain app-owned.
