-- Migration 0010: Belief Engine tables
-- ======================================

create table beliefs (
  id uuid primary key default gen_random_uuid(),
  command_id uuid references commands(id) on delete set null,
  thesis_id uuid references theses(id) on delete set null,
  user_id uuid references users_profile(id) on delete set null,
  agent_id text,
  domain text not null,
  title text not null,
  safe_summary text,
  encrypted_summary jsonb,
  visibility text not null default 'private',
  privacy_tier text not null default 'internal',
  status text not null default 'draft',
  current_confidence numeric,
  initial_confidence numeric,
  risk_score numeric,
  runtime_mode text not null default 'web',
  source_product text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table belief_updates (
  id uuid primary key default gen_random_uuid(),
  belief_id uuid references beliefs(id) on delete cascade,
  update_type text not null,
  title text,
  safe_summary text,
  encrypted_content jsonb,
  confidence_before numeric,
  confidence_after numeric,
  risk_before numeric,
  risk_after numeric,
  source text,
  model_route_id uuid,
  payment_receipt_id uuid,
  inference_receipt_id uuid,
  artifact_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table belief_evidence (
  id uuid primary key default gen_random_uuid(),
  belief_id uuid references beliefs(id) on delete cascade,
  evidence_type text not null,
  title text,
  safe_summary text,
  content text,
  encrypted_content jsonb,
  source_url text,
  weight numeric default 0,
  privacy_tier text default 'internal',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table belief_frames (
  id uuid primary key default gen_random_uuid(),
  belief_id uuid references beliefs(id) on delete cascade,
  frame_index int not null,
  title text,
  safe_summary text,
  confidence numeric,
  risk_score numeric,
  status text,
  feed_item_id uuid references unified_feed_items(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table belief_artifacts (
  id uuid primary key default gen_random_uuid(),
  belief_id uuid references beliefs(id) on delete cascade,
  artifact_type text not null,
  artifact_id uuid,
  storage_path text,
  github_path text,
  public_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_beliefs_domain on beliefs(domain);
create index idx_beliefs_status on beliefs(status);
create index idx_beliefs_visibility on beliefs(visibility);
create index idx_beliefs_privacy_tier on beliefs(privacy_tier);
create index idx_beliefs_created_at on beliefs(created_at);
create index idx_belief_updates_belief on belief_updates(belief_id);
create index idx_belief_evidence_belief on belief_evidence(belief_id);
create index idx_belief_frames_belief on belief_frames(belief_id);

alter table beliefs enable row level security;
alter table belief_updates enable row level security;
alter table belief_evidence enable row level security;
alter table belief_frames enable row level security;
alter table belief_artifacts enable row level security;

create policy "user_owns_belief" on beliefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "public_belief_read" on beliefs
  for select using (visibility = 'public');

create policy "user_owns_belief_updates" on belief_updates
  for all using (exists (select 1 from beliefs where beliefs.id = belief_id and beliefs.user_id = auth.uid()));

create policy "user_owns_belief_evidence" on belief_evidence
  for all using (exists (select 1 from beliefs where beliefs.id = belief_id and beliefs.user_id = auth.uid()));

create policy "user_owns_belief_frames" on belief_frames
  for all using (exists (select 1 from beliefs where beliefs.id = belief_id and beliefs.user_id = auth.uid()));

create policy "user_owns_belief_artifacts" on belief_artifacts
  for all using (exists (select 1 from beliefs where beliefs.id = belief_id and beliefs.user_id = auth.uid()));

comment on table beliefs is 'RBM-inspired Belief Engine — tracks how agent thesis changes over time with evidence, inference, payments, and simulations.';
