-- Migration 0009: Unified Feed tables
-- ====================================

create table unified_feed_items (
  id uuid primary key default gen_random_uuid(),
  source_product text not null,
  source_app text,
  source_service text,
  job_type text not null,
  job_id uuid,
  command_id uuid references commands(id) on delete set null,
  thesis_id uuid references theses(id) on delete set null,
  actor_mode text not null default 'transparent',
  actor_id uuid references users_profile(id) on delete set null,
  actor_pseudonym text,
  encrypted_actor jsonb,
  actor_commitment jsonb,
  title text,
  safe_summary text,
  encrypted_content jsonb,
  redacted_content jsonb,
  commitment_hash text,
  visibility text not null default 'public',
  privacy_mode text not null default 'transparent',
  privacy_tier text not null default 'public',
  status text not null default 'queued',
  runtime_mode text not null default 'web',
  payment_plane text,
  receipt_id uuid,
  cost_usd numeric(12,6),
  currency text default 'USDC',
  artifact_id uuid,
  display_artifact_id uuid,
  model_route_id uuid,
  sponsor_metadata jsonb,
  local_only boolean default false,
  cloud_synced boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table unified_feed_events (
  id uuid primary key default gen_random_uuid(),
  feed_item_id uuid references unified_feed_items(id) on delete cascade,
  event_type text not null,
  status text,
  safe_message text,
  encrypted_event jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table feed_reactions (
  id uuid primary key default gen_random_uuid(),
  feed_item_id uuid references unified_feed_items(id) on delete cascade,
  user_id uuid references users_profile(id) on delete set null,
  reaction_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table feed_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  filter jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table feed_sync_queue (
  id uuid primary key default gen_random_uuid(),
  local_feed_id text,
  feed_item_id uuid references unified_feed_items(id) on delete set null,
  sync_direction text not null,
  status text not null default 'pending',
  privacy_check_status text not null default 'pending',
  error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_unified_feed_product on unified_feed_items(source_product);
create index idx_unified_feed_job_type on unified_feed_items(job_type);
create index idx_unified_feed_status on unified_feed_items(status);
create index idx_unified_feed_visibility on unified_feed_items(visibility);
create index idx_unified_feed_privacy_mode on unified_feed_items(privacy_mode);
create index idx_unified_feed_privacy_tier on unified_feed_items(privacy_tier);
create index idx_unified_feed_runtime on unified_feed_items(runtime_mode);
create index idx_unified_feed_created on unified_feed_items(created_at);
create index idx_unified_feed_actor_pseudonym on unified_feed_items(actor_pseudonym);
create index idx_unified_feed_command on unified_feed_items(command_id);
create index idx_unified_feed_thesis on unified_feed_items(thesis_id);
create index idx_unified_feed_local on unified_feed_items(local_only);
create index idx_feed_events_item on unified_feed_events(feed_item_id);
create index idx_feed_reactions_item on feed_reactions(feed_item_id);
create index idx_feed_sync_status on feed_sync_queue(status);

-- RLS
alter table unified_feed_items enable row level security;
alter table unified_feed_events enable row level security;
alter table feed_reactions enable row level security;
alter table feed_subscriptions enable row level security;
alter table feed_sync_queue enable row level security;

-- Public visibility: readable by all
create policy "public_feed_read" on unified_feed_items
  for select
  using (visibility in ('public', 'unlisted', 'encrypted_public', 'encrypted_unlisted', 'redacted_public'));

-- User-owned private: readable by owner
create policy "private_feed_read" on unified_feed_items
  for select
  using (actor_id = auth.uid() and visibility in ('account_private', 'workspace_private', 'local_private', 'redacted_private'));

-- User feed item insert (user must own)
create policy "user_feed_insert" on unified_feed_items
  for insert
  with check (actor_id = auth.uid());

-- Service role bypasses RLS for inserts
create policy "service_feed_insert" on unified_feed_items
  for insert
  with check (true);

-- Events: readable with same public policy
create policy "public_events_read" on unified_feed_events
  for select
  using (exists (select 1 from unified_feed_items fi where fi.id = feed_item_id and fi.visibility in ('public', 'unlisted', 'encrypted_public', 'encrypted_unlisted', 'redacted_public')));

-- Reactions: users can read public, insert their own
create policy "public_reactions_read" on feed_reactions
  for select
  using (true);
create policy "user_reactions_insert" on feed_reactions
  for insert
  with check (user_id = auth.uid());

-- Subscriptions: user owns
create policy "user_subscriptions" on feed_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sync queue: user owns
create policy "user_sync_queue" on feed_sync_queue
  for all
  using (exists (select 1 from unified_feed_items fi where fi.id = feed_item_id and fi.actor_id = auth.uid()));

comment on table unified_feed_items is 'HyperMyths Unified Feed — one feed for all products, web and local.';
