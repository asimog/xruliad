-- Migration 0002: Agent memory tables
-- ==================================

create table agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  agent_id uuid references agent_profiles(id) on delete set null,
  kind text not null,
  visibility text not null default 'private',
  privacy_tier text not null default 'internal',
  title text not null,
  content text,
  source text,
  command_id uuid,
  thesis_id uuid,
  job_id uuid,
  embedding_available boolean default false,
  cloud_synced boolean default false,
  sync_approved boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memory_chunks (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references agent_memories(id) on delete cascade,
  index_pos integer not null,
  text text not null,
  embedding_status text not null default 'unavailable',
  embedding_model text,
  created_at timestamptz not null default now()
);

-- pgvector column: add only if vector extension is available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    execute 'alter table memory_chunks add column if not exists embedding vector(1536)';
  end if;
end;
$$;

create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  agent_session_id uuid references agent_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  tool_calls jsonb,
  model text,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now()
);

create table agent_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agent_profiles(id) on delete cascade,
  task_type text not null,
  status text not null default 'queued',
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agent_profiles(id) on delete cascade,
  task_id uuid references agent_tasks(id) on delete set null,
  status text not null default 'running',
  model text,
  total_cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id) on delete cascade,
  step_type text not null,
  input jsonb,
  output jsonb,
  error text,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now()
);

create table agent_tools (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agent_profiles(id) on delete cascade,
  tool_name text not null,
  description text,
  schema jsonb,
  enabled boolean default true,
  created_at timestamptz not null default now()
);

create table agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id) on delete cascade,
  kind text not null,
  title text,
  content text,
  storage_url text,
  created_at timestamptz not null default now()
);

create table agent_receipts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agent_profiles(id) on delete cascade,
  run_id uuid references agent_runs(id) on delete set null,
  receipt_type text not null,
  cost_usd numeric(12,6),
  currency text default 'USDC',
  provider text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table agent_audit_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agent_profiles(id) on delete cascade,
  user_id uuid references users_profile(id) on delete set null,
  event text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_agent_memories_user on agent_memories(user_id);
create index idx_agent_memories_kind on agent_memories(kind);
create index idx_agent_memories_visibility on agent_memories(visibility);
create index idx_agent_memories_privacy on agent_memories(privacy_tier);
create index idx_agent_memories_command on agent_memories(command_id);
create index idx_agent_memories_thesis on agent_memories(thesis_id);
create index idx_memory_chunks_memory on memory_chunks(memory_id);
create index idx_agent_messages_session on agent_messages(agent_session_id);
create index idx_agent_runs_agent on agent_runs(agent_id);
create index idx_agent_runs_task on agent_runs(task_id);
create index idx_agent_audit_agent on agent_audit_logs(agent_id);
create index idx_agent_audit_user on agent_audit_logs(user_id);
