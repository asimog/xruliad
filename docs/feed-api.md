# Feed API

## Endpoints

### GET /api/feed
Unified feed. Query params: productId, jobType, status, source, limit, offset.

### GET /api/feed/global
Global ecosystem feed metadata.

### GET /api/feed/product/:productId
Product-scoped feed.

### GET /api/feed/commands/:commandId
Feed items linked to a command.

### GET /api/feed/theses/:thesisId
Feed items linked to a thesis.

### POST /api/feed
Create a feed item. Auto-normalizes with privacy rules.

### POST /api/feed/events
Create a feed event (status change, progress update, artifact attached).

### POST /api/feed/sync
Queue a local-to-cloud sync item.

## Product Feeds

Each app exposes:
- `GET /api/feed` — product-scoped feed
- `GET /feed` — feed page component

Terminal aggregates all product feeds into unified view.

## Realtime

Supabase Realtime used if configured. Otherwise falls back to polling (default 5s interval).

## Hard Rules

- `/api/feed/:id/decrypt-local` only available via local gateway, never on public server.
- Never expose raw `FEED_ACTOR_ENCRYPTION_KEY` to browser.
