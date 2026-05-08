-- Migration 0004: Jobs tables
-- ===========================

create table video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  title text not null,
  prompt text,
  status text not null default 'queued',
  provider text,
  output_url text,
  storage_url text,
  cost_usd numeric(12,6),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table ad_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  title text not null,
  concept text,
  surface text,
  sponsor text,
  status text not null default 'queued',
  output jsonb,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table research_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  product_id text not null,
  title text not null,
  prompt text not null,
  status text not null default 'queued',
  output jsonb,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table simulation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  title text not null,
  scenario text,
  status text not null default 'queued',
  results jsonb,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table intelligence_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  product_id text not null,
  title text not null,
  report_type text not null,
  status text not null default 'queued',
  output jsonb,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table coding_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  title text not null,
  prompt text not null,
  language text,
  status text not null default 'queued',
  output text,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table display_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  thesis_id uuid references theses(id) on delete set null,
  command_id uuid references commands(id) on delete set null,
  kind text not null,
  status text not null default 'queued',
  output_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_video_jobs_user on video_jobs(user_id);
create index idx_video_jobs_status on video_jobs(status);
create index idx_ad_jobs_user on ad_jobs(user_id);
create index idx_research_jobs_product on research_jobs(product_id);
create index idx_simulation_jobs_user on simulation_jobs(user_id);
create index idx_intelligence_jobs_product on intelligence_jobs(product_id);
create index idx_display_jobs_kind on display_jobs(kind);
