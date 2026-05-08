# Display API

Display requests are available to web users, Terminal flows, and authorized agents.

Implemented in `packages/display` and `services/display-worker`.

Display endpoints in HyperMyths Terminal:

- `GET /api/display/capabilities`
- `POST /api/display/video`
- `POST /api/display/intelligence`
- `POST /api/display/ad`
- `POST /api/display/thesis`
- `GET /api/display/:id`

Paid ads must keep sponsor/payment metadata visible.
