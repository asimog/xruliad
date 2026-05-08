alter table if exists payments
  add column if not exists deposit_address text,
  add column if not exists deposit_secret text;
