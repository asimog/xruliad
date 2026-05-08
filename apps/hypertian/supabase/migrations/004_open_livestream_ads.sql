alter table if exists streams
  add column if not exists display_name text,
  add column if not exists profile_url text,
  add column if not exists stream_url text,
  add column if not exists price_sol numeric(20, 9) default 0.001,
  add column if not exists payout_wallet text,
  add column if not exists default_banner_url text,
  add column if not exists default_chart_token_address text,
  add column if not exists overlay_secret_hash text,
  add column if not exists overlay_verified_at timestamptz,
  add column if not exists verification_status text default 'unverified',
  add column if not exists pump_mint text,
  add column if not exists pump_deployer_wallet text,
  add column if not exists pump_creator_verified boolean default false;

alter table if exists ads
  add column if not exists ad_type text default 'chart',
  add column if not exists status text default 'pending_payment',
  add column if not exists dex_pair_address text,
  add column if not exists banner_url text,
  add column if not exists duration_minutes integer default 5,
  add column if not exists starts_at timestamptz,
  add column if not exists payment_tx_signature text,
  add column if not exists paid_to_wallet text,
  add column if not exists advertiser_contact text,
  add column if not exists advertiser_note text;

create index if not exists streams_platform_idx on streams (platform);
create index if not exists streams_verification_status_idx on streams (verification_status);
create index if not exists streams_last_heartbeat_idx on streams (last_heartbeat);
create index if not exists ads_status_idx on ads (status);
create unique index if not exists ads_payment_tx_signature_key
  on ads (payment_tx_signature)
  where payment_tx_signature is not null;
