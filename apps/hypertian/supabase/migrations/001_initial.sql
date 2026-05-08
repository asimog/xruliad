create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  privy_id text unique not null,
  wallet_address text,
  role text default 'creator',
  created_at timestamptz default now()
);

create table if not exists streams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  platform text not null, -- 'x', 'youtube', 'twitch', 'pump'
  is_live boolean default false,
  last_heartbeat timestamptz,
  created_at timestamptz default now()
);

create table if not exists ads (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references streams(id),
  token_address text not null,
  chain text default 'solana',
  position text default 'bottom-right',
  size text default 'medium',
  is_active boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists media_jobs (
  id uuid primary key default uuid_generate_v4(),
  ad_id uuid references ads(id),
  sponsor_wallet text,
  media_path text,                    -- Supabase storage path
  media_type text,                    -- 'image', 'gif', 'video'
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  ad_id uuid references ads(id),
  tx_hash text unique,
  amount numeric(20,8),
  currency text default 'SOL',
  deposit_address text,
  deposit_secret text,
  status text default 'pending',
  verified_at timestamptz,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table ads, media_jobs, streams, payments;
