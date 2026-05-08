-- Migration 0007: Display artifacts, storage, provider config
-- ============================================================

create table display_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  kind text not null,
  title text,
  content text,
  url text,
  surface text,
  visibility text not null default 'public',
  cost_usd numeric(12,6),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table storage_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  bucket text not null,
  path text not null,
  content_type text,
  size_bytes integer,
  public boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table artifact_provenance (
  id uuid primary key default gen_random_uuid(),
  artifact_id text not null,
  artifact_type text not null,
  source_command_id uuid references commands(id) on delete set null,
  source_thesis_id uuid references theses(id) on delete set null,
  source_job_id text,
  source_agent_id uuid references agent_profiles(id) on delete set null,
  github_task_id uuid references github_tasks(id) on delete set null,
  storage_artifact_id uuid references storage_artifacts(id) on delete set null,
  display_artifact_id uuid references display_artifacts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  provider_type text not null,
  config jsonb default '{}'::jsonb,
  enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_capabilities (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique,
  product_name text not null,
  domain text,
  runtime_support text[],
  agent_tools jsonb default '[]'::jsonb,
  schema_version text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table runtime_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  status text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_display_artifacts_kind on display_artifacts(kind);
create index idx_display_artifacts_user on display_artifacts(user_id);
create index idx_storage_artifacts_user on storage_artifacts(user_id);
create index idx_artifact_provenance_type on artifact_provenance(artifact_type);
create index idx_provider_configs_name on provider_configs(provider_name);
create index idx_product_capabilities_product on product_capabilities(product_id);
create index idx_runtime_snapshots_service on runtime_status_snapshots(service_name);
