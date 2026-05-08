alter table if exists streams
  add column if not exists default_chart_token_address text;
