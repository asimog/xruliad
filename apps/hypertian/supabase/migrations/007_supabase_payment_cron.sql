create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.hypertian_cron_secret()
returns text
language plpgsql
stable
as $$
declare
  vault_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into vault_secret
      using 'cron_secret';
  end if;

  return coalesce(
    nullif(vault_secret, ''),
    nullif(current_setting('app.settings.cron_secret', true), '')
  );
end
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'poll-pending-payments'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'poll-pending-payments',
  '*/5 * * * *',
  $cron$
  with settings as (
    select
      public.hypertian_cron_secret() as cron_secret,
      coalesce(nullif(current_setting('app.settings.site_url', true), ''), 'https://hypertian.com') as site_url
  )
  select net.http_get(
    url := (select site_url from settings) || '/api/cron/payments',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || coalesce((select cron_secret from settings), '')
    )
  )
  from settings
  where cron_secret is not null;
  $cron$
);
