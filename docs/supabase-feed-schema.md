# Supabase Feed Schema

## Migration: 0009_unified_feed.sql

### unified_feed_items
Core table. One row per feed item across all products and sources.
- `id` uuid PK
- `source_product` text — which product generated this item
- `job_type` text — FeedJobType enum value
- `actor_mode` text — transparent | encrypted | pseudonymous
- `actor_pseudonym` text — pseudonym for local actors
- `encrypted_actor` jsonb — encrypted actor payload
- `actor_commitment` jsonb — commitment hash for local actors
- `safe_summary` text — redacted/encrypted safe summary for public display
- `visibility` text — FeedVisibility
- `privacy_mode` text — FeedPrivacyMode
- `privacy_tier` text — PrivacyTier
- `status` text — FeedStatus (queued, running, complete, failed, blocked, prepared, sealed, published)
- `runtime_mode` text — web | local | hybrid
- `payment_plane` text — platform | user_local | free
- `local_only` boolean — true if local job
- `cloud_synced` boolean — sync status

### unified_feed_events
Status change and progress events. Linked to feed_items via `feed_item_id` FK.

### feed_reactions
User reactions (star, bookmark, upvote). Public readable by all.

### feed_subscriptions
User feed filter subscriptions for realtime/polling delivery.

### feed_sync_queue
Local-to-cloud sync queue with privacy checks.

## RLS

- Public items (visibility: public, unlisted, encrypted_public, encrypted_unlisted, redacted_public): readable by all.
- Private items (account_private, workspace_private, local_private, redacted_private): readable by owner only.
- Events: readable for public items only.
- Reactions: public read, user can insert own.
- Subscriptions: user owns.

## Indexes

- source_product, job_type, status, visibility, privacy_mode, privacy_tier, runtime_mode, created_at
- actor_pseudonym, command_id, thesis_id
- local_only, feed_sync_queue.status
