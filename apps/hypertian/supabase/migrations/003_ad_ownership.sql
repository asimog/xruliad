alter table if exists ads
  add column if not exists sponsor_id uuid references users(id),
  add column if not exists sponsor_wallet text;

create index if not exists ads_sponsor_id_idx on ads (sponsor_id);
