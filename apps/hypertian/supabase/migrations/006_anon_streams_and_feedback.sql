-- Anonymous streamer profiles + feedback inbox.
-- Heartbeats and best-basis ops do not require Privy users.

alter table if exists users
  alter column privy_id drop not null;

alter table if exists streams
  add column if not exists owner_session text,
  add column if not exists is_hidden boolean default false;

create index if not exists streams_owner_session_idx on streams (owner_session);
create index if not exists streams_is_hidden_idx on streams (is_hidden);

alter table if exists ads
  add column if not exists is_hidden boolean default false;

create index if not exists ads_is_hidden_idx on ads (is_hidden);

create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  category text not null default 'bug',
  message text not null,
  email text,
  context_url text,
  status text not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists feedback_status_idx on feedback (status);
create index if not exists feedback_created_at_idx on feedback (created_at desc);

alter publication supabase_realtime add table feedback;
