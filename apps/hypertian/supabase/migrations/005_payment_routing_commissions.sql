alter table if exists payments
  add column if not exists payment_recipient_kind text default 'streamer_direct',
  add column if not exists commission_bps integer default 0,
  add column if not exists platform_fee_amount numeric(20, 9) default 0,
  add column if not exists streamer_amount numeric(20, 9),
  add column if not exists platform_treasury_wallet text;

create index if not exists payments_payment_recipient_kind_idx on payments (payment_recipient_kind);
