-- Migration 0006: GitHub/code tables
-- ==================================

create table github_repos (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  repo_name text not null,
  installation_id text,
  allowed_modes text[] not null default array['artifact_publish', 'code_edit'],
  artifact_branch text default 'main',
  code_branch_prefix text default 'agent/',
  enabled boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table github_tasks (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references github_repos(id) on delete cascade,
  user_id uuid references users_profile(id) on delete cascade,
  mode text not null,
  branch text,
  branch_type text not null default 'artifact',
  path text not null,
  content text,
  commit_message text,
  pr_title text,
  pr_url text,
  commit_sha text,
  status text not null default 'queued',
  error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table github_branches (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references github_repos(id) on delete cascade,
  task_id uuid references github_tasks(id) on delete set null,
  branch_name text not null,
  branch_type text not null,
  base_branch text,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create table github_commits (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references github_tasks(id) on delete cascade,
  branch_id uuid references github_branches(id) on delete set null,
  sha text,
  message text not null,
  path text,
  author text,
  created_at timestamptz not null default now()
);

create table github_pull_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references github_tasks(id) on delete cascade,
  repo_id uuid references github_repos(id) on delete cascade,
  pr_number integer,
  pr_url text,
  title text not null,
  body text,
  branch text,
  base_branch text,
  status text not null default 'open',
  merged boolean default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table github_artifacts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references github_tasks(id) on delete cascade,
  commit_id uuid references github_commits(id) on delete set null,
  path text not null,
  artifact_kind text,
  size_bytes integer,
  published boolean default false,
  created_at timestamptz not null default now()
);

create table github_publish_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  task_id uuid references github_tasks(id) on delete set null,
  artifact_id uuid references github_artifacts(id) on delete set null,
  event_type text not null,
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_github_repos_owner on github_repos(owner, repo_name);
create index idx_github_tasks_repo on github_tasks(repo_id);
create index idx_github_tasks_user on github_tasks(user_id);
create index idx_github_tasks_status on github_tasks(status);
create index idx_github_branches_repo on github_branches(repo_id);
create index idx_github_pr_task on github_pull_requests(task_id);
create index idx_github_pr_status on github_pull_requests(status);
create index idx_github_artifacts_task on github_artifacts(task_id);
create index idx_github_publish_events_user on github_publish_events(user_id);
