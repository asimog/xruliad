-- Migration 0001: Core identity, session, and pgvector extension
-- =============================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table users_profile (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  display_name text,
  email text,
  avatar_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table terminal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  runtime_mode text not null default 'web',
  ip_address text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table agent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) on delete cascade,
  display_name text not null,
  provider text,
  model text,
  capabilities jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agent_profiles(id) on delete cascade,
  terminal_session_id uuid references terminal_sessions(id) on delete set null,
  status text not null default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index idx_users_profile_external_id on users_profile(external_id);
create index idx_terminal_sessions_user on terminal_sessions(user_id);
create index idx_agent_profiles_user on agent_profiles(user_id);
create index idx_agent_sessions_agent on agent_sessions(agent_id);
