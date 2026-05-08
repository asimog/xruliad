-- Migration 0005: Payments, receipts, approvals, audit
-- =====================================================

create table platform_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  product_id text not null,
  action text not null,
  estimated_cost_usd numeric(12,6),
  final_cost_usd numeric(12,6),
  currency text default 'USDC',
  provider text,
  status text not null default 'quoted',
  receipt_public boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table user_local_payment_receipts_metadata (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  payment_id text not null,
  estimated_cost_usd numeric(12,6),
  currency text default 'USDC',
  provider text,
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table inference_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  command_id uuid references commands(id) on delete set null,
  thesis_id uuid references theses(id) on delete set null,
  provider text not null,
  model text,
  task_class text not null,
  privacy_tier text not null,
  cost_usd numeric(12,6),
  route text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table paid_api_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  api_name text not null,
  endpoint text,
  cost_usd numeric(12,6),
  currency text default 'USDC',
  status text not null default 'completed',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table spend_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  max_request_cost_usd numeric(12,6),
  daily_spend_limit_usd numeric(12,6),
  currency text default 'USDC',
  enabled boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table risk_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  max_trade_size_usd numeric(12,6),
  daily_trade_limit_usd numeric(12,6),
  allowed_venues text[],
  allowed_assets text[],
  require_user_approval boolean default true,
  enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  approval_type text not null,
  target_id text not null,
  target_type text not null,
  status text not null default 'pending',
  approved_by text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete set null,
  agent_id uuid references agent_profiles(id) on delete set null,
  event text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table privacy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  event_type text not null,
  privacy_tier text not null,
  route text,
  approved boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table redaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  source_id text,
  redaction_type text not null,
  original_visibility text,
  new_visibility text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_platform_payment_user on platform_payment_receipts(user_id);
create index idx_platform_payment_public on platform_payment_receipts(receipt_public);
create index idx_inference_receipts_user on inference_receipts(user_id);
create index idx_approvals_user on approvals(user_id);
create index idx_approvals_status on approvals(status);
create index idx_audit_logs_user on audit_logs(user_id);
create index idx_audit_logs_agent on audit_logs(agent_id);
create index idx_privacy_events_user on privacy_events(user_id);
create index idx_redaction_events_user on redaction_events(user_id);
