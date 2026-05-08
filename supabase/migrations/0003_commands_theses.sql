-- Migration 0003: Commands and Theses tables
-- ===========================================

create table commands (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  type text not null,
  title text not null,
  prompt text,
  status text not null default 'draft',
  permission text not null default 'public',
  user_id uuid references users_profile(id) on delete cascade,
  visibility text not null default 'public',
  privacy_tier text not null default 'public',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table command_runs (
  id uuid primary key default gen_random_uuid(),
  command_id uuid references commands(id) on delete cascade,
  agent_id uuid references agent_profiles(id) on delete set null,
  status text not null default 'running',
  route text,
  model text,
  cost_usd numeric(12,6),
  output jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table command_contributions (
  id uuid primary key default gen_random_uuid(),
  command_id uuid references commands(id) on delete cascade,
  contributor text not null,
  kind text not null,
  payload jsonb,
  receipt_id text,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table command_permissions (
  id uuid primary key default gen_random_uuid(),
  command_id uuid references commands(id) on delete cascade,
  user_id uuid references users_profile(id) on delete cascade,
  agent_id uuid references agent_profiles(id) on delete set null,
  permission text not null,
  created_at timestamptz not null default now()
);

create table theses (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  type text not null,
  title text not null,
  claim text not null,
  visibility text not null default 'public',
  privacy_tier text not null default 'public',
  user_id uuid references users_profile(id) on delete cascade,
  sealed boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table thesis_runs (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  agent_id uuid references agent_profiles(id) on delete set null,
  status text not null default 'prepared',
  route text,
  model text,
  cost_usd numeric(12,6),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table thesis_contributions (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  contributor text not null,
  kind text not null,
  payload jsonb,
  receipt_id text,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table thesis_evidence (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  title text not null,
  url text,
  note text,
  evidence_type text,
  created_at timestamptz not null default now()
);

create table thesis_model_outputs (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  run_id uuid references thesis_runs(id) on delete set null,
  model_route text not null,
  summary text,
  cost_usd numeric(12,6),
  output jsonb,
  created_at timestamptz not null default now()
);

create table thesis_simulations (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  summary text not null,
  risks text[],
  results jsonb,
  created_at timestamptz not null default now()
);

create table thesis_media_artifacts (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  kind text not null,
  title text,
  url text,
  summary text,
  storage_url text,
  created_at timestamptz not null default now()
);

create table thesis_ad_placements (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  surface text not null,
  sponsor text,
  sponsor_metadata_visible boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table thesis_research_tasks (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  product_id text not null,
  prompt text not null,
  status text not null default 'queued',
  output jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table thesis_execution_intents (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid references theses(id) on delete cascade,
  command_id uuid references commands(id) on delete set null,
  venue text not null,
  asset text not null,
  side text not null,
  mode text not null default 'web_prepare_only',
  status text not null default 'prepared',
  rationale text,
  execution_ref text,
  created_at timestamptz not null default now()
);

create index idx_commands_product on commands(product_id);
create index idx_commands_status on commands(status);
create index idx_commands_user on commands(user_id);
create index idx_command_contributions_command on command_contributions(command_id);
create index idx_theses_product on theses(product_id);
create index idx_theses_user on theses(user_id);
create index idx_theses_visibility on theses(visibility);
create index idx_thesis_runs_thesis on thesis_runs(thesis_id);
create index idx_thesis_contributions_thesis on thesis_contributions(thesis_id);
create index idx_thesis_execution_thesis on thesis_execution_intents(thesis_id);
