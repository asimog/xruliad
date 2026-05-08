-- Durable abuse protection for public write endpoints.
create table if not exists public.write_rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket, key_hash, window_start)
);

create index if not exists write_rate_limits_cleanup_idx
  on public.write_rate_limits (window_start);

alter table public.write_rate_limits enable row level security;

create or replace function public.check_write_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_bucket is null or p_key_hash is null or p_max_attempts < 1 or p_window_seconds < 1 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  delete from public.write_rate_limits
   where window_start < now() - interval '2 days';

  insert into public.write_rate_limits (bucket, key_hash, window_start, hits, updated_at)
  values (p_bucket, p_key_hash, v_window_start, 1, now())
  on conflict (bucket, key_hash, window_start)
  do update set
    hits = public.write_rate_limits.hits + 1,
    updated_at = now()
  returning hits into v_hits;

  return v_hits <= p_max_attempts;
end;
$$;

revoke all on public.write_rate_limits from anon, authenticated;
revoke all on function public.check_write_rate_limit(text, text, integer, integer) from anon, authenticated;
