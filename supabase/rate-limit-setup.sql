-- Already applied to the KrianStyle Supabase project.
create schema if not exists private;

create table if not exists private.krian_registration_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);

alter table private.krian_registration_rate_limits enable row level security;
alter table private.krian_registration_rate_limits enable row level security;
revoke all on schema private from public, anon, authenticated;
revoke all on table private.krian_registration_rate_limits from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.krian_registration_rate_limits to service_role;

create or replace function public.consume_krian_registration_limit(p_ip_hash text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  if p_ip_hash is null or pg_catalog.length(p_ip_hash) <> 64 then
    return false;
  end if;

  insert into private.krian_registration_rate_limits as limits (
    ip_hash, window_started_at, attempts
  )
  values (p_ip_hash, pg_catalog.now(), 1)
  on conflict (ip_hash) do update
  set
    window_started_at = case
      when limits.window_started_at < pg_catalog.now() - interval '1 hour'
        then pg_catalog.now()
      else limits.window_started_at
    end,
    attempts = case
      when limits.window_started_at < pg_catalog.now() - interval '1 hour'
        then 1
      else limits.attempts + 1
    end
  returning attempts into v_attempts;

  return v_attempts <= 5;
end;
$$;

drop policy if exists "Service role manages registration rate limits" on private.krian_registration_rate_limits;
create policy "Service role manages registration rate limits"
  on private.krian_registration_rate_limits
  for all to service_role
  using (true)
  with check (true);

revoke all on function public.consume_krian_registration_limit(text) from public, anon, authenticated;
grant execute on function public.consume_krian_registration_limit(text) to service_role;
